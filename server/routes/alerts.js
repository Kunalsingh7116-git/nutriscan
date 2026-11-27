const router = require('express').Router();
const auth = require('../middleware/auth');
const Alert = require('../models/Alert');
const { text, page, pageResponse } = require('../input');
const { withUserWrite } = require('../transactions');

const publicFields = 'alert_id date alert_type message status createdAt -_id';

router.get('/', auth, async (req, res) => {
  const pagination = page(req.query, 100);
  if (!pagination) return res.status(400).json({ message: 'Choose a valid page.' });
  try {
    const alerts = await Alert.find({ user_id: req.user.userId }).select(publicFields)
      .sort({ createdAt: -1, _id: -1 }).skip(pagination.skip).limit(pagination.count + 1).lean();
    return pageResponse(res, alerts, pagination);
  } catch {
    return res.status(500).json({ message: 'Couldn’t load alerts. Try again.' });
  }
});

router.get('/meta/unread', auth, async (req, res) => {
  try {
    res.json({ count: await Alert.countDocuments({ user_id: req.user.userId, status: 'Unread' }) });
  } catch {
    res.status(500).json({ message: 'Couldn’t load alerts. Try again.' });
  }
});

router.patch('/:id/read', auth, async (req, res) => {
  if (!text(req.params.id, 80)) return res.sendStatus(404);
  const userId = req.user.userId;
  try {
    const alert = await withUserWrite(userId, session => Alert.findOneAndUpdate(
      { alert_id: req.params.id, user_id: userId }, { $set: { status: 'Read' } }, { session, new: true }
    ).select(publicFields).lean());
    if (!alert) return res.sendStatus(404);
    return res.json(alert);
  } catch (error) {
    return res.status(error.status === 401 ? 401 : 500).json({ message: 'Couldn’t update the alert. Try again.' });
  }
});

router.patch('/read-all', auth, async (req, res) => {
  const userId = req.user.userId;
  try {
    await withUserWrite(userId, session => Alert.updateMany({ user_id: userId, status: 'Unread' },
      { $set: { status: 'Read' } }, { session }));
    res.json({ message: 'All marked as read' });
  } catch (error) {
    res.status(error.status === 401 ? 401 : 500).json({ message: 'Couldn’t update alerts. Try again.' });
  }
});

module.exports = router;
