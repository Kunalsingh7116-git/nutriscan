const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.set('query parser', 'simple');

// Middleware
app.use(cors({ origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:3000', exposedHeaders: ['X-Next-Offset'] }));
app.use('/api/meal-scan', require('./routes/mealScan'));
app.use('/api/meal-photos', require('./routes/mealPhotos'));
app.use(express.json({ limit: '100kb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/health-profiles', require('./routes/healthProfiles'));
app.use('/api/food-products', require('./routes/foodProducts'));
app.use('/api/saved-foods', require('./routes/savedFoods'));
app.use('/api/nutrition', require('./routes/nutrition'));
app.use('/api/consumption', require('./routes/consumption'));
app.use('/api/daily-intake', require('./routes/dailyIntake'));
app.use('/api/alerts', require('./routes/alerts'));

// Serve React in production
app.use('/api', (req, res) => res.status(404).json({ message: 'API route not found.' }));
if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) =>
    res.sendFile(path.join(__dirname, '../client/build/index.html'))
  );
}

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.status === 413) return res.status(413).json({ message: 'The request is too large.' });
  if (error.status === 400 || error.status === 415) {
    return res.status(error.status).json({ message: 'The request could not be read.' });
  }
  require('./security').event('request.failed');
  return res.status(500).json({ message: 'Something went wrong. Try again.' });
});

module.exports = app;
