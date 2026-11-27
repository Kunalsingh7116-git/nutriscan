const { createHmac, randomUUID } = require('node:crypto');
const { isIP } = require('node:net');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const expiresAt = { type: Date, required: true, expires: 0 };
const RateBucket = mongoose.model('RateBucket', new mongoose.Schema({
  _id: String, count: Number, expiresAt,
}, { versionKey: false }));
const RevokedSession = mongoose.model('RevokedSession', new mongoose.Schema({
  _id: String, expiresAt,
}, { versionKey: false }));

const ScanLease = mongoose.model('ScanLease', new mongoose.Schema({
  _id: String, holder: String, expiresAt,
}, { versionKey: false }));

async function lockScan(userId) {
  const _id = hash(JSON.stringify(['scan.active', userId]));
  const holder = randomUUID();
  const now = new Date();
  const filter = { _id, expiresAt: { $lte: now } };
  try {
    await ScanLease.updateOne(filter, { $set: { holder, expiresAt: new Date(now.getTime() + 95000) } }, { upsert: true });
  } catch (error) {
    if (error.code === 11000) return null;
    throw error;
  }
  return () => ScanLease.deleteOne({ _id, holder });
}

function event(name) {
  console.warn(JSON.stringify({ event: name }));
}

function hash(value) {
  return createHmac('sha256', process.env.JWT_SECRET).update(value).digest('hex');
}

function sessionFor(user) {
  return jwt.sign({ userId: user.user_id, sv: user.sessionVersion || 0 }, process.env.JWT_SECRET, {
    algorithm: 'HS256', expiresIn: '7d', jwtid: randomUUID(),
  });
}

function signingKeyReady() {
  const secret = process.env.JWT_SECRET;
  return typeof secret === 'string' && Buffer.byteLength(secret) >= 32
    && new Set(secret).size >= 12 && !/placeholder|change.?me|your.secret|replace.?me|example/i.test(secret);
}

function clientIdentity(req) {
  const forwarded = process.env.VERCEL === '1' ? req.get('x-vercel-forwarded-for') : undefined;
  return isIP(forwarded || '') ? forwarded : req.socket.remoteAddress || 'unknown';
}

async function reserve(bucket, identity, max, windowSeconds) {
  const windowMs = windowSeconds * 1000;
  const now = Date.now();
  const endsAt = (Math.floor(now / windowMs) + 1) * windowMs;
  const _id = hash(JSON.stringify([bucket, identity, endsAt]));
  const filter = { _id };
  const update = { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(endsAt) } };
  const options = { new: true, lean: true };
  let result;
  try {
    result = await RateBucket.findOneAndUpdate(filter, update, { ...options, upsert: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
    result = await RateBucket.findOneAndUpdate(filter, update, options);
  }
  return result.count > max ? Math.ceil((endsAt - now) / 1000) : 0;
}

function limit(name, { ip, account, seconds, identity = req => req.user?.userId }) {
  return async (req, res, next) => {
    try {
      let wait = ip ? await reserve(name + ':ip', clientIdentity(req), ip, seconds) : 0;
      const value = identity(req);
      if (!wait && account && value) wait = await reserve(name + ':account', value, account, seconds);
      if (!wait) return next();
      event('rate_limit.' + name);
      return res.set('Retry-After', String(wait)).status(429).json({ message: 'Too many requests. Please try again later.' });
    } catch {
      event('rate_limit.unavailable');
      return res.status(503).json({ message: 'Please try again shortly.' });
    }
  };
}

module.exports = { RevokedSession, RateBucket, event, hash, sessionFor, signingKeyReady, limit, lockScan };
