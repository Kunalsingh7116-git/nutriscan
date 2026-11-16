require('dotenv').config();
const app = require('./app');
const connectDatabase = require('./database');

const port = process.env.PORT || 5000;
connectDatabase()
  .then(() => app.listen(port, () => console.log(`NutriScan is running on port ${port}`)))
  .catch(error => {
    console.error('MongoDB connection failed:', error.name);
    process.exit(1);
  });
