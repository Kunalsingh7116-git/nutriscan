const router = require('express').Router();
const auth = require('../middleware/auth');
const FoodProduct = require('../models/FoodProduct');
const NutritionDetails = require('../models/NutritionDetails');

// Get all products with nutrition
router.get('/', auth, async (req, res) => {
  try {
    const { search, category } = req.query;
    const filter = {};
    if (search) filter.product_name = { $regex: search, $options: 'i' };
    if (category) filter.category = category;

    const products = await FoodProduct.find(filter).sort({ createdAt: -1 });
    const enriched = await Promise.all(products.map(async (p) => {
      const nutrition = await NutritionDetails.findOne({ product_id: p.product_id });
      return { ...p.toJSON(), nutrition };
    }));
    res.json(enriched);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Get single product
router.get('/:id', auth, async (req, res) => {
  try {
    const product = await FoodProduct.findOne({ product_id: req.params.id });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const nutrition = await NutritionDetails.findOne({ product_id: product.product_id });
    res.json({ ...product.toJSON(), nutrition });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Create product + nutrition
router.post('/', auth, async (req, res) => {
  try {
    const { product_name, brand, category, barcode, serving_size, calories, sugar, sodium, fat, protein } = req.body;
    const product = new FoodProduct({ product_name, brand, category, barcode, serving_size });
    await product.save();
    const nutrition = new NutritionDetails({ product_id: product.product_id, calories, sugar, sodium, fat, protein });
    await nutrition.save();
    res.status(201).json({ ...product.toJSON(), nutrition });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Get categories
router.get('/meta/categories', auth, async (req, res) => {
  try {
    const cats = await FoodProduct.distinct('category');
    res.json(cats);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
