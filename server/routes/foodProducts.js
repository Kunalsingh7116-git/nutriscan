const router = require('express').Router();
const auth = require('../middleware/auth');
const FoodProduct = require('../models/FoodProduct');
const NutritionDetails = require('../models/NutritionDetails');
const { event, limit } = require('../security');
const { text, page, pageResponse } = require('../input');
const { withWrite } = require('../transactions');

const productFields = 'product_id product_name brand category barcode serving_size';
const nutritionFields = 'product_id calories sugar sodium fat protein';
const searchLimit = limit('catalog.read', { ip: 240, account: 120, seconds: 60 });
const createLimit = limit('catalog.write', { ip: 30, account: 15, seconds: 3600 });
const nutrientNames = ['calories', 'sugar', 'sodium', 'fat', 'protein'];

function publicProduct(product, nutrition) {
  const fields = productFields.split(' ');
  return { ...Object.fromEntries(fields.map(field => [field, product[field]])), nutrition };
}

router.get('/', auth, searchLimit, async (req, res) => {
  const { search, category } = req.query;
  const pagination = page(req.query, 100);
  if (!pagination || (search !== undefined && !text(search, 100)) || (category !== undefined && !text(category, 80))) {
    return res.status(400).json({ message: 'Choose a valid search or category.' });
  }
  const filter = {};
  if (search) filter.product_name = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  if (category) filter.category = category;
  try {
    const products = await FoodProduct.find(filter).select(productFields + ' -_id').sort({ createdAt: -1, _id: -1 })
      .skip(pagination.skip).limit(pagination.count + 1).lean();
    const nutrition = await NutritionDetails.find({ product_id: { $in: products.map(p => p.product_id) } })
      .select(nutritionFields + ' -_id').lean();
    const byProduct = new Map(nutrition.map(item => [item.product_id, item]));
    return pageResponse(res, products.map(product => publicProduct(product, byProduct.get(product.product_id) || null)), pagination);
  } catch {
    event('catalog.read_failed');
    return res.status(500).json({ message: 'Couldn’t load the food catalog. Try again.' });
  }
});

router.get('/meta/categories', auth, searchLimit, async (req, res) => {
  try {
    const categories = await FoodProduct.aggregate([
      { $group: { _id: '$category' } }, { $sort: { _id: 1 } }, { $limit: 250 },
    ]);
    res.json(categories.map(category => category._id));
  } catch {
    event('catalog.categories_failed');
    res.status(500).json({ message: 'Couldn’t load categories. Try again.' });
  }
});

router.get('/:id', auth, searchLimit, async (req, res) => {
  if (!text(req.params.id, 80)) return res.sendStatus(404);
  try {
    const product = await FoodProduct.findOne({ product_id: req.params.id }).select(productFields + ' -_id').lean();
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    const nutrition = await NutritionDetails.findOne({ product_id: product.product_id }).select(nutritionFields + ' -_id').lean();
    return res.json(publicProduct(product, nutrition));
  } catch {
    event('catalog.read_failed');
    return res.status(500).json({ message: 'Couldn’t load this product. Try again.' });
  }
});

router.post('/', auth, createLimit, async (req, res) => {
  const { product_name, brand, category, barcode, serving_size } = req.body || {};
  const nutrients = Object.fromEntries(nutrientNames.map(field => {
    const raw = req.body?.[field];
    return [field, typeof raw === 'string' && /^\d+(\.\d+)?$/.test(raw) ? Number(raw) : raw];
  }));
  if (![product_name, brand, category, serving_size].every(value => text(value, 80))
    || (barcode !== undefined && barcode !== '' && !text(barcode, 64))
    || !Object.values(nutrients).every(value => Number.isFinite(value) && value >= 0 && value <= 100000)) {
    return res.status(400).json({ message: 'Enter valid product and nutrition details.' });
  }

  try {
    const entry = await withWrite(async session => {
      const product = new FoodProduct({
        product_name: product_name.trim(), brand: brand.trim(), category: category.trim(),
        barcode: barcode?.trim() || undefined, serving_size: serving_size.trim(),
      });
      await product.save({ session });
      try {
        const details = new NutritionDetails({ product_id: product.product_id, ...nutrients });
        await details.save({ session });
        const nutrition = Object.fromEntries(nutritionFields.split(' ').map(field => [field, details[field]]));
        return publicProduct(product, nutrition);
      } catch (error) {
        if (!session) await FoodProduct.deleteOne({ _id: product._id });
        throw error;
      }
    });
    return res.status(201).json(entry);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'A product with these details already exists.' });
    event('catalog.write_failed');
    return res.status(500).json({ message: 'Couldn’t add this product. Try again.' });
  }
});

module.exports = router;
