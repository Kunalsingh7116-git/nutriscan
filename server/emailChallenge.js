const { randomInt, randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const { hash } = require('./security');

const Challenge = mongoose.model('EmailChallenge', new mongoose.Schema({
  _id: String, codeHash: String, expiresAt: { type: Date, expires: 0 },
}, { versionKey: false }));

const keyFor = (purpose, email) => hash(JSON.stringify(['email', purpose, email]));
const hashCode = (key, code) => hash(JSON.stringify([key, code]));

function available() {
  return Boolean(process.env.RESEND_API_KEY && process.env.ACCOUNT_EMAIL_FROM);
}

async function send(purpose, email) {
  const _id = keyFor(purpose, email);
  const code = String(randomInt(100000000)).padStart(8, '0');
  const codeHash = hashCode(_id, code);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const filter = { _id };
  try {
    await Challenge.updateOne(filter, { $set: { codeHash, expiresAt } }, { upsert: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
    await Challenge.updateOne(filter, { $set: { codeHash, expiresAt } });
  }

  const action = purpose === 'signup' ? 'verify your email' : 'reset your password';
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      redirect: 'error',
      headers: {
        Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
        'Content-Type': 'application/json',
        'Idempotency-Key': randomUUID(),
      },
      body: JSON.stringify({
        from: process.env.ACCOUNT_EMAIL_FROM,
        to: [email],
        subject: 'Your NutriScan verification code',
        text: 'Use this code to ' + action + ' in NutriScan: ' + code
          + '. It expires in 15 minutes. If you did not request it, ignore this email.',
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error('Email delivery failed');
  } catch (error) {
    await Challenge.deleteOne({ _id, codeHash });
    throw error;
  }
}

async function consume(purpose, email, code) {
  if (typeof code !== 'string' || !/^\d{8}$/.test(code)) return false;
  const _id = keyFor(purpose, email);
  return Boolean(await Challenge.findOneAndDelete({
    _id, codeHash: hashCode(_id, code), expiresAt: { $gt: new Date() },
  }));
}

function clearFor(email, session) {
  return Challenge.deleteMany({
    _id: { $in: ['signup', 'reset'].map(purpose => keyFor(purpose, email)) },
  }, { session });
}

module.exports = { available, send, consume, clearFor };
