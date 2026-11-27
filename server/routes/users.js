const router = require('express').Router();
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const User = require('../models/User');
const { event, limit } = require('../security');
const { text } = require('../input');
const { withWrite, withUserWrite } = require('../transactions');
const { clearFor } = require('../emailChallenge');
const GoogleSignIn = require('../models/GoogleSignIn');

const personalModels = [
  require('../models/HealthProfile'), require('../models/ConsumptionRecord'), require('../models/DailyIntake'),
  require('../models/Alert'), require('../models/SavedFood'), require('../models/MealPhoto'),
];

function publicUser(user) {
  return {
    user_id: user.user_id, name: user.name, email: user.email, age: user.age,
    phone_number: user.phone_number, requires_password: Boolean(user.password),
  };
}

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findOne({ user_id: req.user.userId, deletingAt: null }).select('+password');
    if (!user) return res.sendStatus(401);
    res.set('Cache-Control', 'no-store').json(publicUser(user));
  } catch {
    event('profile.read_failed');
    res.status(500).json({ message: 'Couldn’t load your account. Try again.' });
  }
});

router.put('/me', auth, async (req, res) => {
  const { first_name, last_name, phone_number } = req.body || {};
  if ((first_name !== undefined && !text(first_name, 80)) || (last_name !== undefined && !text(last_name, 80))
    || (phone_number !== undefined && phone_number !== '' && !text(phone_number, 32))) {
    return res.status(400).json({ message: 'Enter valid profile details.' });
  }

  const update = {};
  if (first_name !== undefined) update['name.first'] = first_name.trim();
  if (last_name !== undefined) update['name.last'] = last_name.trim();
  if (phone_number !== undefined) update.phone_number = phone_number ? [phone_number.trim()] : [];
  const userId = req.user.userId;

  try {
    const user = await withUserWrite(userId, session => User.findOneAndUpdate(
      { user_id: userId, deletingAt: null }, { $set: update }, { session, new: true, runValidators: true }
    ).select('+password'));
    if (!user) return res.sendStatus(401);
    res.json(publicUser(user));
  } catch (error) {
    event('profile.update_failed');
    res.status(error.status === 401 ? 401 : 500).json({ message: 'Couldn’t update your account. Try again.' });
  }
});

router.delete('/me', auth, limit('account.delete', { ip: 16, account: 4, seconds: 900 }), async (req, res) => {
  const { confirmation, password } = req.body || {};
  if (confirmation !== 'DELETE') return res.status(400).json({ message: 'Enter DELETE to confirm.' });

  const filter = { user_id: req.user.userId, deletingAt: null };
  try {
    const user = await User.findOne(filter).select('+password +sessionVersion');
    if (!user) return res.sendStatus(401);
    if (user.password) {
      if (typeof password !== 'string' || !password || Buffer.byteLength(password) > 4096
        || !await bcrypt.compare(password, user.password)) {
        event('account.delete_rejected');
        return res.status(403).json({ message: 'Enter your current password.' });
      }
    } else if (Date.now() - req.user.issuedAt * 1000 > 10 * 60 * 1000) {
      return res.status(403).json({ message: 'Sign in again with Google, then return here to delete your account.' });
    }

    await withWrite(async session => {
      const locked = await User.findOneAndUpdate({ ...filter, sessionVersion: user.sessionVersion || { $in: [0, null] } },
        { $set: { deletingAt: new Date() } }, { session });
      if (!locked) throw Object.assign(new Error('Account unavailable'), { status: 401 });
      for (const model of personalModels) await model.deleteMany({ user_id: filter.user_id }, { session });
      await GoogleSignIn.deleteMany({ userId: filter.user_id }, { session });
      await clearFor(user.email, session);
      await User.deleteOne({ _id: user._id }, { session });
    }, { requireTransaction: true });
    event('account.deleted');
    res.sendStatus(204);
  } catch (error) {
    event('account.delete_failed');
    const status = [401, 503].includes(error.status) ? error.status : 500;
    res.status(status).json({ message: 'Couldn’t delete your account. Try again or contact support.' });
  }
});

module.exports = router;
