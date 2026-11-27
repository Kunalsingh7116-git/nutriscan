const router = require('express').Router();
const auth = require('../middleware/auth');
const HealthProfile = require('../models/HealthProfile');
const { randomUUID } = require('node:crypto');
const { text } = require('../input');
const { withUserWrite } = require('../transactions');

const requiredFields = ['weight', 'height', 'lifestyle_type'];
const editableFields = [...requiredFields, 'medical_conditions', 'allergies'];

function profileFields(body) {
  return Object.fromEntries(editableFields.filter(field => Object.hasOwn(body, field))
    .map(field => [field, body[field]]));
}

function profileResponse(profile) {
  if (!profile) return null;
  return { ...Object.fromEntries(editableFields.map(field => [field, profile[field]])), bmi: profile.bmi };
}

function validFields(fields) {
  return Object.entries(fields).every(([field, value]) => {
    if (field === 'weight' || field === 'height') {
      return Number.isFinite(value) && value >= 0.1 && value <= 700;
    }
    if (field === 'lifestyle_type') return ['Active', 'Sedentary', 'Moderate'].includes(value);
    return Array.isArray(value) && value.length <= 30 && value.every(item => text(item, 120));
  });
}

function profileError(res, error) {
  if (error.status === 401) return res.sendStatus(401);
  if (error.status === 503) return res.status(503).json({ message: 'Profile updates are temporarily unavailable.' });
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ message: 'Enter a positive height and weight and choose an activity level.' });
  }
  if (error.code === 11000) {
    return res.status(409).json({ message: 'This profile was saved in another request. Try again.' });
  }
  console.error('Could not save health profile:', error.name);
  return res.status(500).json({ message: 'Couldn’t save your profile. Try again.' });
}

router.get('/', auth, async (req, res) => {
  try {
    const profile = await HealthProfile.findOne({ user_id: req.user.userId });
    res.json(profileResponse(profile));
  } catch { res.status(500).json({ message: 'Couldn’t load your health profile. Try again.' }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const fields = profileFields(req.body || {});
    if (!validFields(fields) || !requiredFields.every(field => Object.hasOwn(fields, field))) {
      return res.status(400).json({ message: 'Enter valid health profile details.' });
    }
    const userId = req.user.userId;
    const profile = await withUserWrite(userId, async session => {
      const record = new HealthProfile({ ...fields, user_id: userId });
      return record.save({ session });
    });
    res.status(201).json(profileResponse(profile));
  } catch (err) { profileError(res, err); }
});

router.put('/', auth, async (req, res) => {
  try {
    const fields = profileFields(req.body || {});
    if (!validFields(fields) || !Object.keys(fields).length) {
      return res.status(400).json({ message: 'Enter valid health profile details.' });
    }
    const complete = requiredFields.every(field => Object.hasOwn(fields, field));
    const update = { $set: fields };
    if (complete) update.$setOnInsert = { profile_id: randomUUID() };
    const userId = req.user.userId;
    const profile = await withUserWrite(userId, session => HealthProfile.findOneAndUpdate(
      { user_id: userId }, update, { session, new: true, upsert: complete, runValidators: true }
    ));
    if (!profile) return res.status(400).json({ message: 'Add your height, weight, and activity level to set up your profile.' });
    res.json(profileResponse(profile));
  } catch (err) { profileError(res, err); }
});

module.exports = router;
