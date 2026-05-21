const router = require('express').Router();
const auth = require('../middleware/auth');
const HealthProfile = require('../models/HealthProfile');

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
    const profile = new HealthProfile({ ...req.body, user_id: req.user.userId });
    await profile.save();
    res.status(201).json(profile);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/', auth, async (req, res) => {
  try {
    const profile = await HealthProfile.findOneAndUpdate(
      { user_id: req.user.userId },
      req.body,
      { new: true, upsert: true, runValidators: true }
    );
    res.json(profile);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
