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
const { resourceId, date: validDate, text, page, pageResponse } = require('../input');
const { withUserWrite } = require('../transactions');
const { event } = require('../security');

const validTime = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const publicFields = 'record_id product_id meal_name meal_items quantity time date photo_id save_to_library createdAt';

const limits = [
  { key: 'calories', label: 'Calories', value: 2000, unit: 'kcal' },
  { key: 'sugar', label: 'Sugar', value: 50, unit: 'g' },
  { key: 'sodium', label: 'Sodium', value: 2300, unit: 'mg' },
  { key: 'fat', label: 'Fat', value: 65, unit: 'g' },
];
const pending = new Map();

async function updateDay(userId, date, mutate) {
  const key = userId + '/' + date;
  const task = (pending.get(key) || Promise.resolve()).catch(() => {}).then(() =>
    withUserWrite(userId, async session => {
      const result = await mutate(session);
      await recalculate(userId, date, session);
      return result;
    })
  );
  pending.set(key, task);
  try {
    return await task;
  } finally {
    if (pending.get(key) === task) pending.delete(key);
  }
}

async function nutritionFor(records, session = null) {
  const ids = [...new Set(records.map(record => record.product_id).filter(Boolean))];
  const details = ids.length ? await NutritionDetails.find({ product_id: { $in: ids } }).session(session).lean() : [];
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

async function recalculate(userId, date, session) {
  const records = await ConsumptionRecord.find({ user_id: userId, date }).session(session).lean();
  const totals = sumNutrients(records, await nutritionFor(records, session));
  const fields = Object.fromEntries(nutrients.map(key => ['total_' + key, totals[key]]));
  await DailyIntake.updateOne(
    { user_id: userId, date },
    { $set: fields, $setOnInsert: { intake_id: randomUUID() } },
    { upsert: true, session }
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
      { upsert: true, session }
    );
  }
}

router.post('/meal', auth, async (req, res) => {
  const { id, title, items, date, time, photoId, savedFoodId, saveToLibrary } = req.body || {};
  if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id)
    || typeof title !== 'string' || !title.trim() || title.length > 100
    || !Array.isArray(items) || items.length < 1 || items.length > 12 || !items.every(validMealItem)
    || !validDate(date) || !validTime(time)
    || (photoId !== undefined && !resourceId(photoId))
    || (savedFoodId !== undefined && !resourceId(savedFoodId))
    || (photoId && savedFoodId)
    || (saveToLibrary !== undefined && typeof saveToLibrary !== 'boolean')
    || (saveToLibrary && !photoId)) {
    return res.status(400).json({ message: 'Review your meal and try saving it again.' });
  }

  const userId = req.user.userId;
  const recordId = userId + '-' + id;
  try {
    const record = await updateDay(userId, date, async session => {
      let originalPhotoId;
      if (savedFoodId) {
        const saved = await SavedFood.findOne({ ...resourceId(savedFoodId), user_id: userId })
          .select('photo_id').session(session).lean();
        if (!saved) throw Object.assign(new Error('Missing saved food'), { status: 404 });
        originalPhotoId = saved.photo_id;
      } else if (photoId) {
        const photo = await MealPhoto.exists({ ...resourceId(photoId), user_id: userId }).session(session);
        if (!photo) throw Object.assign(new Error('Missing photo'), { status: 404 });
        originalPhotoId = photo._id;
      }
      const meal = await ConsumptionRecord.findOneAndUpdate(
        { record_id: recordId, user_id: userId, date },
        { $setOnInsert: {
          meal_name: title.trim(), meal_items: items, quantity: 1, time,
          photo_id: originalPhotoId, save_to_library: saveToLibrary === true,
        } },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: false, session }
      );
      if (meal.save_to_library) {
        await SavedFood.updateOne({ source_record: recordId, user_id: userId }, {
          $setOnInsert: { public_id: randomUUID(), title: meal.meal_name, items: meal.meal_items, photo_id: meal.photo_id },
        }, { upsert: true, session });
      }
      return meal;
    });
    const [entry] = await publicRecords([record], userId);
    res.status(201).json(entry);
  } catch (error) {
    if (error.status === 401) return res.sendStatus(401);
    if (error.status === 404) return res.status(404).json({ message: 'This meal photo or saved food isn’t available.' });
    event('meal.write_failed');
    res.status(500).json({ message: 'Your meal couldn’t be saved. Please retry.' });
  }
});


async function publicRecords(records, userId) {
  const photoIds = [...new Set(records.map(record => record.photo_id?.toString()).filter(Boolean))];
  const photos = photoIds.length ? await MealPhoto.find({ _id: { $in: photoIds }, user_id: userId }).select('public_id').lean() : [];
  const byId = new Map(photos.map(photo => [photo._id.toString(), photo.public_id || photo._id]));
  return records.map(record => {
    const shown = Object.fromEntries(publicFields.split(' ').map(field => [field, record[field]]));
    shown.photo_id = byId.get(record.photo_id?.toString());
    return shown;
  });
}

router.post('/', auth, async (req, res) => {
  const { product_id, quantity, date, time } = req.body || {};
  const user_id = req.user.userId;
  const amount = typeof quantity === 'string' && /^\d+(\.\d+)?$/.test(quantity) ? Number(quantity) : quantity;
  if (!text(product_id, 80) || !Number.isFinite(amount) || amount <= 0 || amount > 1000 || !validDate(date) || !validTime(time)) {
    return res.status(400).json({ message: 'Enter a valid food, serving quantity, date and time.' });
  }
  try {
    const record = await updateDay(user_id, date, async session => {
      if (!await FoodProduct.exists({ product_id }).session(session)) {
        throw Object.assign(new Error('Missing product'), { status: 404 });
      }
      const meal = new ConsumptionRecord({ user_id, product_id, quantity: amount, date, time });
      return meal.save({ session });
    });
    const [entry] = await publicRecords([record], user_id);
    return res.status(201).json(entry);
  } catch (error) {
    if (error.status === 401) return res.sendStatus(401);
    if (error.status === 404) return res.status(404).json({ message: 'Product not found.' });
    event('meal.write_failed');
    return res.status(500).json({ message: 'Couldn’t save your meal. Try again.' });
  }
});

router.get('/', auth, async (req, res) => {
  const userId = req.user.userId;
  const filter = { user_id: userId };
  const pagination = page(req.query, 100);
  if (!pagination || (req.query.date !== undefined && !validDate(req.query.date))) {
    return res.status(400).json({ message: 'Choose a valid meal date or page.' });
  }
  if (req.query.date) filter.date = req.query.date;
  try {
    const records = await ConsumptionRecord.find(filter).select(publicFields + ' -_id')
      .sort({ date: -1, time: -1, createdAt: -1, _id: -1 })
      .skip(pagination.skip).limit(pagination.count + 1).lean();
    const ids = [...new Set(records.map(record => record.product_id).filter(Boolean))];
    const [details, products, visible] = await Promise.all([
      nutritionFor(records),
      ids.length ? FoodProduct.find({ product_id: { $in: ids } }).select('product_id product_name brand').lean() : [],
      publicRecords(records, userId),
    ]);
    const names = new Map(products.map(product => [product.product_id, product]));
    return pageResponse(res, visible.map((record, index) => ({
      ...record,
      display_name: record.meal_name || names.get(record.product_id)?.product_name || record.product_id,
      product_brand: names.get(record.product_id)?.brand,
      nutrients: sumNutrients([records[index]], details),
    })), pagination);
  } catch {
    event('meal.read_failed');
    return res.status(500).json({ message: 'Couldn’t load meals. Try again.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  if (!text(req.params.id, 160)) return res.sendStatus(404);
  try {
    const filter = { record_id: req.params.id, user_id: req.user.userId };
    const record = await ConsumptionRecord.findOne(filter).select('date').lean();
    if (!record) return res.status(404).json({ message: 'Meal not found.' });
    await updateDay(filter.user_id, record.date, session => ConsumptionRecord.deleteOne(filter, { session }));
    return res.json({ message: 'Deleted' });
  } catch (error) {
    if (error.status === 401) return res.sendStatus(401);
    event('meal.delete_failed');
    return res.status(500).json({ message: 'Couldn’t delete your meal. Try again.' });
  }
});

module.exports = router;
