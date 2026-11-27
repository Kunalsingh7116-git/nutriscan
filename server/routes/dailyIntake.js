const router = require('express').Router();
const auth = require('../middleware/auth');
const DailyIntake = require('../models/DailyIntake');
const { date: validDate, page, pageResponse } = require('../input');

router.get('/', auth, async (req, res) => {
  const { date, from, to } = req.query;
  const pagination = page(req.query, 366);
  const filter = { user_id: req.user.userId };
  if (!pagination || (date !== undefined && (from !== undefined || to !== undefined || !validDate(date)))) {
    return res.status(400).json({ message: 'Choose a valid date or page.' });
  }
  if (date) filter.date = date;
  else if (from !== undefined || to !== undefined) {
    if (!validDate(from) || !validDate(to) || from > to || Date.parse(to) - Date.parse(from) > 365 * 86400000) {
      return res.status(400).json({ message: 'Choose a date range of up to one year.' });
    }
    filter.date = { $gte: from, $lte: to };
  }
  try {
    const intakes = await DailyIntake.find(filter).select('date total_calories total_sugar total_sodium total_fat total_protein total_carbs total_fiber -_id')
      .sort({ date: -1, _id: -1 }).skip(pagination.skip).limit(pagination.count + 1).lean();
    return pageResponse(res, intakes, pagination);
  } catch {
    return res.status(500).json({ message: 'Couldn’t load your nutrition history. Try again.' });
  }
});

module.exports = router;
