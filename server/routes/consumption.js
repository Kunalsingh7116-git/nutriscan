const { randomUUID } = require('node:crypto');
const router = require('express').Router();
const auth = require('../middleware/auth');
const ConsumptionRecord = require('../models/ConsumptionRecord');
const FoodProduct = require('../models/FoodProduct');
const NutritionDetails = require('../models/NutritionDetails');
const DailyIntake = require('../models/DailyIntake');
const Alert = require('../models/Alert');
const MealPhoto = require('../models/MealPhoto');
const SavedFood = require('../models/SavedFood');
const { nutrients, validMealItem } = require('../models/mealItem');

const limits = [
  { key: 'calories', label: 'Calories', value: 2000, unit: 'kcal' },
  { key: 'sugar', label: 'Sugar', value: 50, unit: 'g' },
  { key: 'sodium', label: 'Sodium', value: 2300, unit: 'mg' },
  { key: 'fat', label: 'Fat', value: 65, unit: 'g' },
];
const pending = new Map();

async function updateDay(userId, date, mutate) {
  const key = userId + '/' + date;
  const task = (pending.get(key) || Promise.resolve()).catch(() => {}).then(async () => {
    const result = await mutate();
    await recalculate(userId, date);
    return result;
  });
  pending.set(key, task);
  try {
    return await task;
  } finally {
    if (pending.get(key) === task) pending.delete(key);
  }
}

async function nutritionFor(records) {
  const ids = [...new Set(records.map(record => record.product_id).filter(Boolean))];
  const details = ids.length ? await NutritionDetails.find({ product_id: { $in: ids } }).lean() : [];
  return new Map(details.map(item => [item.product_id, item]));
}

function sumNutrients(records, products) {
  const totals = Object.fromEntries(nutrients.map(key => [key, 0]));
  for (const record of records) {
    const items = record.meal_items || [products.get(record.product_id)];
    for (const item of items) {
      for (const key of nutrients) totals[key] += (item?.[key] || 0) * record.quantity;
    }
  }
  return totals;
}

async function recalculate(userId, date) {
  const records = await ConsumptionRecord.find({ user_id: userId, date }).lean();
  const totals = sumNutrients(records, await nutritionFor(records));
  const fields = Object.fromEntries(nutrients.map(key => ['total_' + key, totals[key]]));
  await DailyIntake.updateOne(
    { user_id: userId, date },
    { $set: fields, $setOnInsert: { intake_id: randomUUID() } },
    { upsert: true }
  );

  for (const { key, label, value, unit } of limits) {
    if (totals[key] <= value) continue;
    const alert_type = 'High ' + label;
    await Alert.updateOne(
      { user_id: userId, date, alert_type },
      { $setOnInsert: {
        alert_id: randomUUID(), status: 'Unread',
        message: `${label} reached ${Math.round(totals[key])} ${unit} (daily reference ${value} ${unit}).`,
      } },
      { upsert: true }
    );
  }
}

router.post('/meal', auth, async (req, res) => {
  const { id, title, items, date, time, photoId, savedFoodId, saveToLibrary } = req.body || {};
  const validId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
  if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id)
    || typeof title !== 'string' || !title.trim() || title.length > 100
    || !Array.isArray(items) || items.length < 1 || items.length > 12 || !items.every(validMealItem)
    || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date))
    || new Date(date).toISOString().slice(0, 10) !== date
    || typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
    || (photoId !== undefined && !validId(photoId))
    || (savedFoodId !== undefined && !validId(savedFoodId))
    || (photoId && savedFoodId)
    || (saveToLibrary !== undefined && typeof saveToLibrary !== 'boolean')
    || (saveToLibrary && !photoId)) {
    return res.status(400).json({ message: 'Review your meal and try saving it again.' });
  }

  const userId = req.user.userId;
  const recordId = userId + '-' + id;
  try {
    let originalPhotoId;
    if (savedFoodId) {
      const saved = await SavedFood.findOne({ _id: savedFoodId, user_id: userId }).select('photo_id').lean();
      if (!saved) return res.status(404).json({ message: 'This saved food isn’t available.' });
      originalPhotoId = saved.photo_id;
    } else if (photoId) {
      const photo = await MealPhoto.exists({ _id: photoId, user_id: userId });
      if (!photo) return res.status(404).json({ message: 'This meal photo isn’t available.' });
      originalPhotoId = photo._id;
    }

    const record = await updateDay(userId, date, async () => {
      const meal = await ConsumptionRecord.findOneAndUpdate(
        { record_id: recordId, user_id: userId, date },
        { $setOnInsert: {
          meal_name: title.trim(), meal_items: items, quantity: 1, time,
          photo_id: originalPhotoId, save_to_library: saveToLibrary === true,
        } },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: false }
      );
      if (meal.save_to_library) {
        await SavedFood.updateOne({ source_record: recordId, user_id: userId }, {
          $setOnInsert: { title: meal.meal_name, items: meal.meal_items, photo_id: meal.photo_id },
        }, { upsert: true });
      }
      return meal;
    });
    res.status(201).json(record);
  } catch (error) {
    console.error('Meal log failed:', error.name);
    res.status(500).json({ message: 'Your meal couldn’t be saved. Please retry.' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { product_id, quantity, date, time } = req.body;
    const user_id = req.user.userId;
    const record = await updateDay(user_id, date, () =>
      ConsumptionRecord.create({ user_id, product_id, quantity, date, time })
    );
    res.status(201).json(record);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/', auth, async (req, res) => {
  try {
    const filter = { user_id: req.user.userId };
    if (typeof req.query.date === 'string') filter.date = req.query.date;
    const query = ConsumptionRecord.find(filter).sort({ date: -1, time: -1, createdAt: -1 });
    const limit = Number(req.query.limit);
    if (Number.isInteger(limit) && limit >= 1 && limit <= 100) query.limit(limit);
    const records = await query.lean();
    const ids = [...new Set(records.map(record => record.product_id).filter(Boolean))];
    const [details, products] = await Promise.all([
      nutritionFor(records),
      ids.length ? FoodProduct.find({ product_id: { $in: ids } }).lean() : [],
    ]);
    const names = new Map(products.map(product => [product.product_id, product.product_name]));
    res.json(records.map(record => ({
      ...record,
      display_name: record.meal_name || names.get(record.product_id) || record.product_id,
      nutrients: sumNutrients([record], details),
    })));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const filter = { record_id: req.params.id, user_id: req.user.userId };
    const record = await ConsumptionRecord.findOne(filter).lean();
    if (!record) return res.status(404).json({ message: 'Meal not found' });
    await updateDay(record.user_id, record.date, () => ConsumptionRecord.deleteOne(filter));
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
