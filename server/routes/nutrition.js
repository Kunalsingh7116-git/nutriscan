const router = require('express').Router();
const auth = require('../middleware/auth');
const NutritionDetails = require('../models/NutritionDetails');

router.get('/:productId', auth, async (req, res) => {
  try {
    const n = await NutritionDetails.findOne({ product_id: req.params.productId });
    if (!n) return res.status(404).json({ message: 'Not found' });
    res.json(n);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
