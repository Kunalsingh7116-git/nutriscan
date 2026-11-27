const router = require('express').Router();
const auth = require('../middleware/auth');
const NutritionDetails = require('../models/NutritionDetails');

router.get('/:productId', auth, async (req, res) => {
  try {
    if (req.params.productId.length > 80) return res.sendStatus(404);
    const n = await NutritionDetails.findOne({ product_id: req.params.productId })
      .select('product_id calories sugar sodium fat protein -_id').lean();
    if (!n) return res.status(404).json({ message: 'Not found' });
    res.json(n);
  } catch (err) { res.status(500).json({ message: 'Couldn’t load nutrition details. Try again.' }); }
});

module.exports = router;
