const router = require('express').Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { RevokedSession, event, limit, sessionFor } = require('../security');
const input = require('../input');
const challenge = require('../emailChallenge');

router.use('/google', require('./googleAuth'));

const emailIdentity = req => input.email(req.body?.email);
const sendLimit = limit('email.send', { ip: 20, account: 5, seconds: 3600, identity: emailIdentity });
const verifyLimit = limit('email.verify', { ip: 40, account: 10, seconds: 900, identity: emailIdentity });
const codeMessage = 'If this address is eligible, a code will arrive shortly.';
const codeError = { message: 'Enter a valid code or request a new one.' };

function validPassword(password) {
  return typeof password === 'string' && password.trim().length >= 12 && Buffer.byteLength(password) <= 72;
}

function requestCode(purpose) {
  return async (req, res) => {
    const email = emailIdentity(req);
    if (!email) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (!challenge.available()) return res.status(503).json({ message: 'Account email is temporarily unavailable.' });
    try {
      await challenge.send(purpose, email);
    } catch {
      event('account_email.failed');
    }
    return res.set('Cache-Control', 'no-store').status(202).json({ message: codeMessage });
  };
}

router.post('/register/code', sendLimit, requestCode('signup'));
router.post('/password-reset/code', sendLimit, requestCode('reset'));
const loginLimit = limit('login', { ip: 60, account: 20, seconds: 900, identity: req => input.email(req.body?.email) });
const invalidCredentials = { message: 'Invalid credentials.' };
// Compare against a fixed synthetic hash when there is no password account.
const unusedPasswordHash = '$2a$10$X9rse9UpzTO.7P4vLahLHOZmmlor4dyUIvqC6WfzsTv14bsWYfp92';

function publicUser(user) {
  return { user_id: user.user_id, name: user.name, email: user.email, age: user.age, requires_password: true };
}

router.post('/register', verifyLimit, async (req, res) => {
  const { first_name, last_name, password, phone_number, date_of_birth, code } = req.body || {};
  const email = input.email(req.body?.email);
  if (!email || !input.text(first_name, 80) || !input.text(last_name, 80)
    || !validPassword(password)
    || (phone_number !== undefined && phone_number !== '' && !input.text(phone_number, 32))
    || !input.date(date_of_birth) || Date.parse(date_of_birth) > Date.now()) {
    return res.status(400).json({ message: 'Enter valid account details and a password with at least 12 characters.' });
  }
  try {
    if (!await challenge.consume('signup', email, code)) return res.status(400).json(codeError);
    const user = await User.create({
      name: { first: first_name.trim(), last: last_name.trim() },
      email, password, phone_number: phone_number ? [phone_number.trim()] : [], date_of_birth,
    });
    res.set('Cache-Control', 'no-store').status(201).json({ token: sessionFor(user), user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Couldn’t create this account. Check your details or sign in.' });
    event('registration.failed');
    res.status(500).json({ message: 'Couldn’t create your account. Try again.' });
  }
});

router.post('/login', loginLimit, async (req, res) => {
  const email = input.email(req.body?.email);
  const password = req.body?.password;
  if (!email || typeof password !== 'string' || !password || Buffer.byteLength(password) > 4096) {
    event('login.rejected');
    return res.status(400).json(invalidCredentials);
  }

  try {
    const user = await User.findOne({ email, deletingAt: null }).select('+password +sessionVersion');
    const valid = await bcrypt.compare(password, user?.password || unusedPasswordHash);
    if (!user?.password || !valid) {
      event('login.rejected');
      return res.status(400).json(invalidCredentials);
    }
    res.set('Cache-Control', 'no-store').json({ token: sessionFor(user), user: publicUser(user) });
  } catch {
    event('login.failed');
    res.status(500).json({ message: 'Couldn’t sign in. Try again.' });
  }
});

router.post('/password-reset', verifyLimit, async (req, res) => {
  const email = emailIdentity(req);
  const { password, code } = req.body || {};
  if (!email || !validPassword(password)) {
    return res.status(400).json({ message: 'Enter a valid email and a password with at least 12 characters.' });
  }
  try {
    if (!await challenge.consume('reset', email, code)) return res.status(400).json(codeError);
    const result = await User.updateOne({ email, deletingAt: null, password: { $type: 'string' } }, {
      $set: { password: await bcrypt.hash(password, 10) },
      $inc: { sessionVersion: 1 },
    });
    if (result.matchedCount !== 1) return res.status(400).json(codeError);
    res.sendStatus(204);
  } catch {
    event('password_reset.failed');
    res.status(500).json({ message: 'Couldn’t reset your password. Try again.' });
  }
});

router.post('/logout', auth, async (req, res) => {
  try {
    await RevokedSession.updateOne(
      { _id: req.user.sessionId },
      { $setOnInsert: { expiresAt: new Date(req.user.expiresAt * 1000) } },
      { upsert: true }
    );
    res.sendStatus(204);
  } catch {
    event('logout.failed');
    res.status(503).json({ message: 'Couldn’t end this session. Try again.' });
  }
});

module.exports = router;
