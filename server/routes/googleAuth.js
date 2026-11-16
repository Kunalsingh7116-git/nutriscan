const router = require('express').Router();
const { randomBytes, createHash } = require('node:crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const GoogleSignIn = require('../models/GoogleSignIn');

const random = () => randomBytes(32).toString('base64url');
const hash = value => createHash('sha256').update(value).digest('base64url');
const validToken = value => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
const googleClient = new OAuth2Client();

function config() {
  const { GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: secret, GOOGLE_REDIRECT_URI: redirect } = process.env;
  if (!clientId || !secret || !redirect) return null;
  try {
    const url = new URL(redirect);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/api/auth/google/callback'
      || (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) return null;
    return { clientId, secret, redirect, origin: url.origin };
  } catch { return null; }
}

router.use((req, res, next) => {
  res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
  next();
});

router.get('/config', (req, res) => res.json({ origin: config()?.origin || null }));

router.post('/native/start', async (req, res) => {
  const settings = config();
  if (!settings || req.get('origin') !== settings.origin || !settings.origin.startsWith('https:')) {
    return res.status(503).json({ message: 'Google sign-in requires the live NutriScan server.' });
  }
  try {
    const nonce = random();
    await GoogleSignIn.create({
      state: nonce, claimHash: hash(random()), status: 'native',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    res.json({ nonce, clientId: settings.clientId });
  } catch {
    res.status(500).json({ message: 'Couldn’t start Google sign-in. Try again.' });
  }
});

router.post('/native/finish', async (req, res) => {
  const settings = config();
  const { nonce, idToken } = req.body || {};
  if (!settings || req.get('origin') !== settings.origin || !settings.origin.startsWith('https:')
    || !validToken(nonce) || typeof idToken !== 'string' || !idToken || idToken.length > 10000) {
    return res.status(400).json({ message: 'Invalid Google sign-in request.' });
  }
  let identity;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: settings.clientId });
    identity = ticket.getPayload();
    if (identity?.nonce !== nonce) throw new Error('Nonce mismatch');
  } catch {
    return res.status(401).json({ message: 'Couldn’t verify your Google account. Try again.' });
  }
  try {
    const flow = await GoogleSignIn.findOneAndDelete({ state: nonce, status: 'native', expiresAt: { $gt: new Date() } });
    if (!flow) return res.status(410).json({ message: 'This Google sign-in has expired. Start again.' });
    const account = await findGoogleUser(identity);
    if (!account) return res.status(400).json({
      message: 'Couldn’t use this Google account. If you already use this email, sign in with your password.',
    });
    return sendSession(res, account);
  } catch {
    return res.status(500).json({ message: 'Couldn’t finish Google sign-in. Try again.' });
  }
});

router.post('/start', async (req, res) => {
  const settings = config();
  if (!settings || req.get('origin') !== settings.origin) {
    return res.status(503).json({ message: 'Google sign-in isn’t available on this server address.' });
  }
  const state = random();
  const claim = random();
  const verifier = random();
  try {
    await GoogleSignIn.create({
      state, claimHash: hash(claim), verifier, android: req.body?.android === true,
      status: 'pending', expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    const params = new URLSearchParams({
      client_id: settings.clientId, redirect_uri: settings.redirect, response_type: 'code',
      scope: 'openid email profile', state, code_challenge: hash(verifier), code_challenge_method: 'S256',
      prompt: 'select_account',
    });
    res.json({ claim, url: 'https://accounts.google.com/o/oauth2/v2/auth?' + params });
  } catch (error) {
    console.error('Could not start Google sign-in:', error.name);
    res.status(500).json({ message: 'Couldn’t start Google sign-in. Try again.' });
  }
});

async function googleIdentity(code, verifier, settings) {
  const exchange = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      code, code_verifier: verifier, grant_type: 'authorization_code',
      client_id: settings.clientId, client_secret: settings.secret, redirect_uri: settings.redirect,
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!exchange.ok) throw new Error('Google code exchange failed');
  const { access_token: accessToken } = await exchange.json();
  if (!accessToken) throw new Error('Google access token missing');
  const identity = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: 'Bearer ' + accessToken },
    signal: AbortSignal.timeout(12000),
  });
  if (!identity.ok) throw new Error('Google identity unavailable');
  return identity.json();
}

async function findGoogleUser(identity) {
  if (identity.email_verified !== true || typeof identity.sub !== 'string' || !identity.sub
    || typeof identity.email !== 'string' || !identity.email.trim()) return null;
  const existing = await User.findOne({ google_sub: identity.sub });
  if (existing) return existing;
  const email = identity.email.trim().toLowerCase();
  if (await User.exists({ email })) return null;
  try {
    return await User.create({
      google_sub: identity.sub, email,
      name: { first: identity.given_name?.trim() || identity.name?.trim() || 'Google', last: identity.family_name?.trim() || 'User' },
    });
  } catch (error) {
    if (error.code === 11000) return User.findOne({ google_sub: identity.sub });
    throw error;
  }
}

router.get('/callback', async (req, res) => {
  const settings = config();
  if (!settings || !validToken(req.query.state)) return res.status(400).send('Invalid Google sign-in request.');
  try {
    const flow = await GoogleSignIn.findOneAndUpdate(
      { state: req.query.state, status: 'pending', expiresAt: { $gt: new Date() } },
      { $set: { status: 'processing' }, $unset: { verifier: '' } },
      { new: false }
    );
    if (!flow) return res.status(400).send('This sign-in has expired. Return to NutriScan and try again.');

    let result = { status: 'failed', error: 'Google sign-in was cancelled.' };
    if (typeof req.query.code === 'string' && !req.query.error) {
      try {
        const user = await findGoogleUser(await googleIdentity(req.query.code, flow.verifier, settings));
        result = user ? { status: 'ready', userId: user.user_id } : {
          status: 'failed', error: 'Couldn’t use this Google account. If you already use this email, sign in with your password.',
        };
      } catch (error) {
        console.error('Google sign-in failed:', error.name);
        result = { status: 'failed', error: 'Couldn’t verify your Google account. Try again.' };
      }
    }
    await GoogleSignIn.updateOne({ _id: flow._id }, { $set: result });
    if (!flow.android) return res.redirect(303, '/auth/google');
    res.type('html').send('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width, initial-scale=1"><title>NutriScan</title><main><h1>Return to NutriScan</h1><p><a href="nutriscan-mobile://google-sign-in">Open NutriScan</a> to finish signing in.</p></main></html>');
  } catch (error) {
    console.error('Could not complete Google sign-in:', error.name);
    res.status(500).send('Couldn’t complete Google sign-in. Return to NutriScan and try again.');
  }
});

router.post('/claim', async (req, res) => {
  const { claim } = req.body || {};
  if (!validToken(claim)) return res.status(400).json({ message: 'Invalid Google sign-in request.' });
  const query = { claimHash: hash(claim), expiresAt: { $gt: new Date() } };
  try {
    const flow = await GoogleSignIn.findOneAndDelete({ ...query, status: { $in: ['ready', 'failed'] } });
    if (!flow) {
      if (await GoogleSignIn.exists(query)) return res.status(202).json({ pending: true });
      return res.status(410).json({ message: 'This Google sign-in has expired. Start again.' });
    }
    if (flow.status === 'failed') return res.status(400).json({ message: flow.error });
    const account = await User.findOne({ user_id: flow.userId });
    if (!account) return res.status(410).json({ message: 'This Google sign-in has expired. Start again.' });
    sendSession(res, account);
  } catch (error) {
    console.error('Could not finish Google sign-in:', error.name);
    res.status(500).json({ message: 'Couldn’t finish Google sign-in. Try again.' });
  }
});

function sendSession(res, account) {
  const { user_id, name, email, age } = account;
  const token = jwt.sign({ userId: user_id, email }, process.env.JWT_SECRET, { expiresIn: '7d' });
  return res.json({ token, user: { user_id, name, email, age } });
}

module.exports = router;
