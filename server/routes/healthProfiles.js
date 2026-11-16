const router = require('express').Router();
const auth = require('../middleware/auth');
const HealthProfile = require('../models/HealthProfile');
const { randomUUID } = require('node:crypto');

const requiredFields = ['weight', 'height', 'lifestyle_type'];
const editableFields = [...requiredFields, 'medical_conditions', 'allergies'];

function profileFields(body) {
  return Object.fromEntries(editableFields.filter(field => Object.hasOwn(body, field))
    .map(field => [field, body[field]]));
}

function profileError(res, error) {
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
    res.json(profile);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const existing = await HealthProfile.findOne({ user_id: req.user.userId });
    if (existing) return res.status(400).json({ message: 'Profile already exists, use PUT to update' });
    const profile = new HealthProfile({ ...profileFields(req.body || {}), user_id: req.user.userId });
    await profile.save();
    res.status(201).json(profile);
  } catch (err) { profileError(res, err); }
});

router.put('/', auth, async (req, res) => {
  try {
    const fields = profileFields(req.body || {});
    const complete = requiredFields.every(field => Object.hasOwn(fields, field));
    const update = { $set: fields };
    if (complete) update.$setOnInsert = { profile_id: randomUUID() };
    const profile = await HealthProfile.findOneAndUpdate(
      { user_id: req.user.userId },
      update,
      { new: true, upsert: complete, runValidators: true }
    );
    if (!profile) return res.status(400).json({ message: 'Add your height, weight, and activity level to set up your profile.' });
    res.json(profile);
  } catch (err) { profileError(res, err); }
});

module.exports = router;
