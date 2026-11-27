const app = require('../server/app');
const connectDatabase = require('../server/database');
const { signingKeyReady } = require('../server/security');

module.exports = async function handler(req, res) {
  if (!process.env.MONGODB_URI || !signingKeyReady()) {
    return res.status(503).json({ message: 'NutriScan’s server setup is incomplete.' });
  }

  try {
    await connectDatabase();
  } catch (error) {
    console.error('MongoDB connection failed:', error.name);
    return res.status(503).json({ message: 'The database is temporarily unavailable.' });
  }

  const url = new URL(req.url, 'http://localhost');
  const apiPath = url.searchParams.get('__nutriscan_path');
  url.searchParams.delete('__nutriscan_path');
  if (url.pathname === '/api/handler' && apiPath) url.pathname = '/api/' + apiPath;
  req.url = url.pathname + url.search;
  return app(req, res);
};
