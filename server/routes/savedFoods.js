const router = require('express').Router();
const auth = require('../middleware/auth');
const SavedFood = require('../models/SavedFood');
const MealPhoto = require('../models/MealPhoto');
const { event } = require('../security');
const { resourceId, page, pageResponse } = require('../input');

async function serialize(foods, userId) {
  const ids = [...new Set(foods.map(food => food.photo_id?.toString()).filter(Boolean))];
  const photos = ids.length ? await MealPhoto.find({ _id: { $in: ids }, user_id: userId }).select('public_id').lean() : [];
  const byId = new Map(photos.map(photo => [photo._id.toString(), photo.public_id || photo._id]));
  return foods.map(food => ({
    _id: food.public_id || food._id, title: food.title, items: food.items,
    photo_id: byId.get(food.photo_id?.toString()),
  }));
}

router.get('/', auth, async (req, res) => {
  const pagination = page(req.query, 100);
  if (!pagination) return res.status(400).json({ message: 'Choose a valid page.' });
  const userId = req.user.userId;
  try {
    const foods = await SavedFood.find({ user_id: userId }).select('public_id title items photo_id')
      .sort({ createdAt: -1, _id: -1 }).skip(pagination.skip).limit(pagination.count + 1).lean();
    return pageResponse(res, await serialize(foods, userId), pagination);
  } catch {
    event('library.read_failed');
    return res.status(500).json({ message: 'Couldn’t load your saved foods.' });
  }
});

router.get('/:id', auth, async (req, res) => {
  const savedId = resourceId(req.params.id);
  if (!savedId) return res.sendStatus(404);
  const userId = req.user.userId;
  try {
    const food = await SavedFood.findOne({ ...savedId, user_id: userId }).select('public_id title items photo_id').lean();
    if (!food) return res.status(404).json({ message: 'This saved food isn’t available.' });
    const [visible] = await serialize([food], userId);
    return res.json(visible);
  } catch {
    event('library.read_failed');
    return res.status(500).json({ message: 'Couldn’t load this saved food.' });
  }
});

module.exports = router;
