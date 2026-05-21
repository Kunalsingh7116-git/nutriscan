const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findOne({ user_id: req.user.userId }).select('-password');
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/me', auth, async (req, res) => {
  try {
    const { first_name, last_name, phone_number } = req.body;
    const update = {};
    if (first_name) update['name.first'] = first_name;
    if (last_name) update['name.last'] = last_name;
    if (phone_number) update.phone_number = [phone_number];
    const user = await User.findOneAndUpdate({ user_id: req.user.userId }, update, { new: true }).select('-password');
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
