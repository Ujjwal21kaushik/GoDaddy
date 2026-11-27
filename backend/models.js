const mongoose = require('mongoose');

const MenuItemSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  cat: String,
  price: { type: Number, required: true },
  emoji: String,
  img: String,
  desc: String,
  prep: { type: Number, default: 3 },
  batchSize: { type: Number, default: 4 },
  stock: { type: Number, default: 20 },
  daily: Number,
  low: { type: Number, default: 5 },
  popular: Boolean,
  veg: Boolean,
  available: { type: Boolean, default: true },
  weekUnits: Number,
}, { versionKey: false });

const OrderItemSchema = new mongoose.Schema({
  id: String,
  name: String,
  price: Number,
  qty: Number,
}, { _id: false });

const HistoryEntrySchema = new mongoose.Schema({
  status: String,
  at: Number,
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, index: true },
  name: String,
  rollNo: String,
  usernameKey: { type: String, index: true },
  phone: String,
  slot: Number,
  nowMin: Number,
  payment: String,
  items: [OrderItemSchema],
  total: Number,
  discount: Number,
  day: { type: Number, default: 0 },
  createdAt: Number,
  status: String,
  prevStatus: String,
  requiresApproval: Boolean,
  isPreOrderRequest: Boolean,
  exceedsStock: Boolean,
  cookMinutes: Number,
  suggestedSlot: Number,
  proposedSlot: Number,
  isPreOrder: Boolean,
  approvalDeadline: Number,
  cancelRequestedAt: Number,
  cancelDeadline: Number,
  cancelRejected: Boolean,
  isFuturePipelineOrder: Boolean,
  stockDeducted: Boolean,
  bulkCookAheadAlert: mongoose.Schema.Types.Mixed,
  history: [HistoryEntrySchema],
}, { versionKey: false });

const SettingsSchema = new mongoose.Schema({
  _id: { type: String, default: 'canteen_config' },
  open: { type: Number, default: 480 },
  close: { type: Number, default: 1260 },
  def: { type: Number, default: 20 },
  overrides: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { versionKey: false });

const MissedDemandSchema = new mongoose.Schema({
  id: String,
  itemId: String,
  name: String,
  cat: String,
  price: Number,
  qty: Number,
  day: Number,
  hour: Number,
  bucket: Number,
  altId: String,
  altName: String,
  altPrice: Number,
  ts: Number,
  seeded: Boolean,
  reason: String,
}, { versionKey: false });

const BulkAlertSchema = new mongoose.Schema({
  itemId: String,
  itemName: String,
  qty: Number,
  slotMinutes: Number,
  prepStartTimeStr: String,
  message: String,
  createdAt: { type: Number, default: () => Date.now() },
}, { versionKey: false });

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  usernameKey: { type: String, required: true, unique: true },
  rollNo: { type: String, default: '' },
  phone: { type: String, default: '' },
  fullName: { type: String, default: '' },
  email: { type: String, default: '' },
  canteenName: { type: String, default: '' },
  counterLocation: { type: String, default: '' },
  upiId: { type: String, default: '' },
  bio: { type: String, default: '' },
  passwordHash: { type: String, required: true },
  passwordSalt: { type: String, required: true },
  refreshTokenHash: { type: String, default: '', index: true },
  refreshTokenExpiresAt: { type: Number, default: 0 },
  role: { type: String, enum: ['student', 'staff'], default: 'student' },
  createdAt: { type: Number, default: () => Date.now() },
  lastLoginAt: { type: Number, default: () => Date.now() },
}, { versionKey: false });

const ComboItemSchema = new mongoose.Schema({
  id: { type: String, required: true },
  qty: { type: Number, default: 1 },
}, { _id: false });

const ComboSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  tagline: { type: String, default: '' },
  items: { type: [ComboItemSchema], default: [] },
  price: { type: Number, required: true },
  active: { type: Boolean, default: true },
  createdAt: { type: Number, default: () => Date.now() },
}, { versionKey: false });

module.exports = {
  MenuItem: mongoose.model('MenuItem', MenuItemSchema, 'menu_items'),
  Order: mongoose.model('Order', OrderSchema, 'orders'),
  Settings: mongoose.model('Settings', SettingsSchema, 'settings'),
  MissedDemand: mongoose.model('MissedDemand', MissedDemandSchema, 'missed_demands'),
  BulkAlert: mongoose.model('BulkAlert', BulkAlertSchema, 'bulk_alerts'),
  User: mongoose.model('User', UserSchema, 'users'),
  Combo: mongoose.model('Combo', ComboSchema, 'combos'),
};
