const mongoose = require('mongoose');

let connecting;

module.exports = function connectDatabase() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!connecting) {
    connecting = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 10,
    }).finally(() => { connecting = undefined; });
  }
  return connecting;
};
