// database.js - MongoDB Atlas connection, config bootstrap, and demo reset
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

const mongoose = require('mongoose');
const { MenuItem, Order, Settings, MissedDemand, BulkAlert, Combo } = require('./models');

const DEFAULT_SETTINGS = { open: 8 * 60, close: 21 * 60, def: 20, overrides: {} };

async function ensureConfig() {
  await Settings.updateOne(
    { _id: 'canteen_config' },
    { $setOnInsert: { _id: 'canteen_config', ...DEFAULT_SETTINGS } },
    { upsert: true }
  );
}

async function connectDB() {
  const uri = (process.env.MONGODB_URI || '').trim();
  const dbName = (process.env.DB_NAME || 'quickorder').trim();

  if (!uri || uri.includes('<db_username>') || uri.includes('<db_password>')) {
    throw new Error(
      'MongoDB Atlas credentials not configured. Open backend/.env and replace <db_username> and <db_password> in MONGODB_URI with your real MongoDB Atlas username and password.'
    );
  }

  try {
    await mongoose.connect(uri, {
      dbName,
      serverSelectionTimeoutMS: 10000,
    });
  } catch (err) {
    if (/querySrv|ENOTFOUND|ECONNREFUSED/i.test(err.message)) {
      throw new Error(
        `${err.message}. Tip: check your internet/DNS (try standard non-SRV mongodb:// hosts from Atlas "Drivers" -> older Node driver) and verify your IP is allowed in MongoDB Atlas Network Access.`
      );
    }
    throw err;
  }

  console.log(`Connected to MongoDB Atlas (database: ${mongoose.connection.name})`);
  await ensureConfig();
}

async function resetDatabase() {
  await Promise.all([
    Order.deleteMany({}),
    MissedDemand.deleteMany({}),
    BulkAlert.deleteMany({}),
    MenuItem.updateMany({}, { $set: { stock: 20, available: true } }),
  ]);
  await Settings.findByIdAndUpdate(
    'canteen_config',
    { $set: DEFAULT_SETTINGS },
    { upsert: true }
  );
  const [menu, combos] = await Promise.all([
    MenuItem.find({}, { _id: 0 }).lean(),
    Combo.find({}, { _id: 0 }).sort({ createdAt: 1 }).lean(),
  ]);
  return { menu, combos, orders: [], settings: DEFAULT_SETTINGS };
}

module.exports = {
  connectDB,
  resetDatabase,
  DEFAULT_SETTINGS,
};
