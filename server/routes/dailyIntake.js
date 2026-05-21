const router = require('express').Router();
const auth = require('../middleware/auth');
const DailyIntake = require('../models/DailyIntake');

router.get('/', auth, async (req, res) => {
  try {
    const { date } = req.query;
    const filter = { user_id: req.user.userId };
    if (date) filter.date = date;
    const intakes = await DailyIntake.find(filter).sort({ date: -1 });
    res.json(intakes);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
