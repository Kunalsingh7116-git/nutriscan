const router = require('express').Router();
const auth = require('../middleware/auth');
const SavedFood = require('../models/SavedFood');

router.get('/', auth, async (req, res) => {
  try {
    const foods = await SavedFood.find({ user_id: req.user.userId })
      .select('title items photo_id').sort({ createdAt: -1, _id: -1 }).lean();
    res.json(foods);
  } catch (error) {
    console.error('Could not list saved foods:', error.name);
    res.status(500).json({ message: 'Couldn’t load your saved foods.' });
  }
});

router.get('/:id', auth, async (req, res) => {
  if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.sendStatus(404);
  try {
    const food = await SavedFood.findOne({ _id: req.params.id, user_id: req.user.userId })
      .select('title items photo_id').lean();
    if (!food) return res.status(404).json({ message: 'This saved food isn’t available.' });
    res.json(food);
  } catch (error) {
    console.error('Could not read saved food:', error.name);
    res.status(500).json({ message: 'Couldn’t load this saved food.' });
  }
});

module.exports = router;
