const mongoose = require('mongoose');
const User = require('./models/User');

let lastConnection;
let capabilities;

function transactionsAvailable() {
  const client = mongoose.connection.getClient();
  if (lastConnection !== client || !capabilities) {
    lastConnection = client;
    capabilities = mongoose.connection.db.admin().command({ hello: 1 })
      .then(hello => Boolean(hello.setName || hello.msg === 'isdbgrid'))
      .catch(error => { capabilities = undefined; throw error; });
  }
  return capabilities;
}

async function withWrite(task, { requireTransaction = false } = {}) {
  if (await transactionsAvailable()) return mongoose.connection.transaction(task);
  if (requireTransaction || process.env.VERCEL === '1') throw Object.assign(new Error('Transaction unavailable'), { status: 503 });
  return task(null);
}

function withUserWrite(userId, task) {
  return withWrite(async session => {
    if (session) {
      const result = await User.updateOne({ user_id: userId, deletingAt: null }, {
        $inc: { writeVersion: 1 },
      }, { session, timestamps: false });
      if (result.matchedCount !== 1) throw Object.assign(new Error('Account unavailable'), { status: 401 });
    }
    return task(session);
  });
}

module.exports = { withWrite, withUserWrite };
