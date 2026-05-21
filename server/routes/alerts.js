const router = require('express').Router();
const auth = require('../middleware/auth');
const Alert = require('../models/Alert');

router.get('/', auth, async (req, res) => {
  try {
    const alerts = await Alert.find({ user_id: req.user.userId }).sort({ createdAt: -1 });
    res.json(alerts);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.patch('/:id/read', auth, async (req, res) => {
  try {
    const alert = await Alert.findOneAndUpdate(
      { alert_id: req.params.id, user_id: req.user.userId },
      { status: 'Read' },
      { new: true }
    );
    res.json(alert);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.patch('/read-all', auth, async (req, res) => {
  try {
    await Alert.updateMany({ user_id: req.user.userId, status: 'Unread' }, { status: 'Read' });
    res.json({ message: 'All marked as read' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
