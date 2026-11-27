const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { RevokedSession, event, hash } = require('../security');

module.exports = async function (req, res, next) {
  const match = /^Bearer ([^\s,]{1,4096})$/i.exec(req.get('Authorization') || '');
  if (!match) return res.status(401).json({ message: 'Sign in to continue.' });
  let decoded;
  try {
    decoded = jwt.verify(match[1], process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof decoded?.userId !== 'string' || !decoded.userId || decoded.userId.length > 128
      || !Number.isInteger(decoded.exp) || !Number.isInteger(decoded.iat)) throw new Error('Invalid claims');
  } catch {
    event('session.invalid');
    return res.status(401).json({ message: 'Sign in to continue.' });
  }

  try {
    const sessionId = hash(match[1]);
    const owner = await User.findOne({ user_id: decoded.userId, deletingAt: null }).select('user_id +sessionVersion').lean();
    if (!owner || (owner.sessionVersion || 0) !== (decoded.sv ?? 0) || await RevokedSession.exists({ _id: sessionId })) {
      return res.status(401).json({ message: 'Sign in to continue.' });
    }
    res.set('Cache-Control', 'private, no-store');
    req.user = { userId: decoded.userId, issuedAt: decoded.iat, expiresAt: decoded.exp, sessionId };
    return next();
  } catch {
    event('session.store_unavailable');
    return res.status(503).json({ message: 'Please try again shortly.' });
  }
};
