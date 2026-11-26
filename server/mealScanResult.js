const { validMealItem } = require('./models/mealItem');

class InvalidMealScan extends Error {
  constructor(reason) {
    super(reason);
    this.name = 'InvalidMealScan';
  }
}

function parseMealScan(output) {
  let scan;
  try { scan = JSON.parse(output); }
  catch { throw new InvalidMealScan('invalid_json'); }
  if (scan?.status === 'retake') {
    if (typeof scan.reason !== 'string' || !scan.reason.trim()) throw new InvalidMealScan('missing_retake_reason');
    return { status: 'retake', reason: scan.reason.trim().slice(0, 200) };
  }
  if (scan?.status !== 'ready') throw new InvalidMealScan('missing_ready_result');
  if (typeof scan.title !== 'string' || !scan.title.trim() || scan.title.trim().length > 100) {
    throw new InvalidMealScan('invalid_title');
  }
  if (!Array.isArray(scan.foods) || scan.foods.length < 1 || scan.foods.length > 12) {
    throw new InvalidMealScan('invalid_food_count');
  }
  const foods = scan.foods.map(food => {
    if (!food || typeof food.question !== 'string' || !Array.isArray(food.options)
      || food.options.length < 1 || food.options.length > 3) throw new InvalidMealScan('invalid_options');
    if (!food.options.every(item => validMealItem(item) && typeof item.label === 'string'
      && item.label.trim().length > 0 && item.label.trim().length <= 100)) {
      throw new InvalidMealScan('invalid_food_values');
    }
    // A question with one valid option has nothing for the user to choose.
    // Keep the estimate and skip that question instead of failing the entire meal.
    return { question: food.options.length === 1 ? '' : food.question.trim(), options: food.options };
  });
  return { status: 'ready', title: scan.title.trim(), reason: '', foods };
}

module.exports = { InvalidMealScan, parseMealScan };
