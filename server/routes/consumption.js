const router = require('express').Router();
const auth = require('../middleware/auth');
const ConsumptionRecord = require('../models/ConsumptionRecord');
const NutritionDetails = require('../models/NutritionDetails');
const DailyIntake = require('../models/DailyIntake');
const Alert = require('../models/Alert');

const DAILY_LIMITS = {
  calories: 2000,
  sugar: 50,
  sodium: 2300,
  fat: 65,
  protein: 50,
};

async function updateDailyIntakeAndAlerts(userId, date) {
  const records = await ConsumptionRecord.find({ user_id: userId, date });
  let totals = { total_calories: 0, total_sugar: 0, total_sodium: 0, total_fat: 0, total_protein: 0 };

  for (const r of records) {
    const n = await NutritionDetails.findOne({ product_id: r.product_id });
    if (n) {
      totals.total_calories += n.calories * r.quantity;
      totals.total_sugar += n.sugar * r.quantity;
      totals.total_sodium += n.sodium * r.quantity;
      totals.total_fat += n.fat * r.quantity;
      totals.total_protein += n.protein * r.quantity;
    }
  }

  await DailyIntake.findOneAndUpdate(
    { user_id: userId, date },
    { ...totals },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Auto-generate alerts for exceeded limits
  const checks = [
    { key: 'calories', field: 'total_calories', type: 'High Calories', limit: DAILY_LIMITS.calories },
    { key: 'sugar', field: 'total_sugar', type: 'High Sugar', limit: DAILY_LIMITS.sugar },
    { key: 'sodium', field: 'total_sodium', type: 'High Sodium', limit: DAILY_LIMITS.sodium },
    { key: 'fat', field: 'total_fat', type: 'High Fat', limit: DAILY_LIMITS.fat },
  ];

  for (const c of checks) {
    if (totals[c.field] > c.limit) {
      const exists = await Alert.findOne({ user_id: userId, date, alert_type: c.type });
      if (!exists) {
        await new Alert({
          user_id: userId,
          date,
          alert_type: c.type,
          message: `${c.type}: You have consumed ${Math.round(totals[c.field])} / ${c.limit} ${c.key === 'calories' ? 'kcal' : 'mg'}`,
          status: 'Unread',
        }).save();
      }
    }
  }
}

// Log consumption
router.post('/', auth, async (req, res) => {
  try {
    const { product_id, quantity, date, time } = req.body;
    const record = new ConsumptionRecord({ user_id: req.user.userId, product_id, quantity, date, time });
    await record.save();
    await updateDailyIntakeAndAlerts(req.user.userId, date);
    res.status(201).json(record);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Get records by date
router.get('/', auth, async (req, res) => {
  try {
    const { date } = req.query;
    const filter = { user_id: req.user.userId };
    if (date) filter.date = date;
    const records = await ConsumptionRecord.find(filter).sort({ date: -1, time: -1 });
    res.json(records);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Delete record
router.delete('/:id', auth, async (req, res) => {
  try {
    const record = await ConsumptionRecord.findOneAndDelete({ record_id: req.params.id, user_id: req.user.userId });
    if (!record) return res.status(404).json({ message: 'Not found' });
    await updateDailyIntakeAndAlerts(req.user.userId, record.date);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
