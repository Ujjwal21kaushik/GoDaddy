// backend/server.js - OrderQuick Real-Time API backed by MongoDB Atlas
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { connectDB, resetDatabase, DEFAULT_SETTINGS } = require('./database');
const { MenuItem, Order, Settings, MissedDemand, BulkAlert, User, Combo } = require('./models');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    ok: mongoose.connection.readyState === 1,
    db: mongoose.connection.name || process.env.DB_NAME || 'quickorder',
    readyState: mongoose.connection.readyState,
  });
});

// ---------------------------------------------------------------------
// 0. ROLE-BASED AUTH (Student Sign Up / Sign In, Staff Login, Access & Refresh Tokens)
// ---------------------------------------------------------------------

const ACCESS_TOKEN_TTL_SEC = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const JWT_SECRET =
  process.env.JWT_SECRET ||
  crypto.createHash('sha256').update(process.env.MONGODB_URI || 'orderquick-jwt-secret').digest('hex');

function hashSecret(secret, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(secret, salt, 64).toString('hex');
  return { salt, hash };
}

function verifySecret(secret, salt, expectedHash) {
  const actual = Buffer.from(crypto.scryptSync(secret, salt, 64).toString('hex'), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function b64url(input) {
  return Buffer.from(typeof input === 'string' ? input : JSON.stringify(input))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function unb64url(str) {
  const pad = '='.repeat((4 - (str.length % 4)) % 4);
  return Buffer.from((str + pad).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex');
}

function signAccessToken(user) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + ACCESS_TOKEN_TTL_SEC;
  const header = b64url({ alg: 'HS256', typ: 'JWT' });
  const payload = b64url({
    sub: String(user._id),
    username: user.username,
    usernameKey: user.usernameKey,
    rollNo: user.rollNo || '',
    phone: user.phone || '',
    role: user.role || 'student',
    iat,
    exp,
  });
  const sig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return { accessToken: `${header}.${payload}.${sig}`, accessTokenExpiresAt: exp * 1000 };
}

function verifyAccessToken(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 3) return { ok: false, expired: false };
    const [header, payload, sig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { ok: false, expired: false };
    }
    const decoded = JSON.parse(unb64url(payload));
    if (!decoded || !decoded.exp || decoded.exp * 1000 <= Date.now()) {
      return { ok: false, expired: true };
    }
    return { ok: true, payload: decoded };
  } catch {
    return { ok: false, expired: false };
  }
}

function safeUser(u) {
  return {
    username: u.username,
    rollNo: u.rollNo || '',
    phone: u.phone || '',
    fullName: u.fullName || '',
    email: u.email || '',
    canteenName: u.canteenName || '',
    counterLocation: u.counterLocation || '',
    upiId: u.upiId || '',
    bio: u.bio || '',
    role: u.role || 'student',
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
  };
}

async function issueTokens(userDoc) {
  const { accessToken, accessTokenExpiresAt } = signAccessToken(userDoc);
  const refreshToken = crypto.randomBytes(40).toString('hex');
  const refreshTokenExpiresAt = Date.now() + REFRESH_TOKEN_TTL_MS;

  userDoc.refreshTokenHash = hashToken(refreshToken);
  userDoc.refreshTokenExpiresAt = refreshTokenExpiresAt;
  userDoc.lastLoginAt = Date.now();
  await userDoc.save();

  return {
    accessToken,
    accessTokenExpiresAt,
    refreshToken,
    refreshTokenExpiresAt,
    user: safeUser(userDoc),
  };
}

// POST /auth/register (First-time Student Sign Up ONLY: username + password + phone)
app.post('/auth/register', async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || req.body?.rollNo || '').trim();
    const phone = String(req.body?.phone || '').trim();

    if (username.length < 2 || password.length < 2) {
      return res.status(400).json({ error: 'Enter both username and password (at least 2 characters each).' });
    }
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: 'Enter a valid 10-digit phone number.' });
    }

    const usernameKey = username.toLowerCase();
    const existing = await User.findOne({ usernameKey });
    if (existing) {
      return res.status(409).json({
        error: 'This username is already registered. Switch to Sign In using your username and password.',
      });
    }

    const { salt, hash } = hashSecret(password);
    const now = Date.now();
    const created = new User({
      username,
      usernameKey,
      rollNo: password,
      phone,
      passwordHash: hash,
      passwordSalt: salt,
      role: 'student',
      createdAt: now,
      lastLoginAt: now,
    });
    const tokens = await issueTokens(created);
    console.log(`[AUTH REGISTER] ${created.username} (${created.phone}) saved to MongoDB users`);
    res.status(201).json({ ok: true, isNew: true, ...tokens });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /auth/login (Returning Student Sign In: username + password ONLY)
app.post('/auth/login', async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || req.body?.rollNo || '').trim();
    if (username.length < 2 || password.length < 2) {
      return res.status(400).json({ error: 'Enter both username and password.' });
    }

    const usernameKey = username.toLowerCase();
    const existing = await User.findOne({ usernameKey, role: 'student' });
    if (!existing) {
      return res.status(404).json({
        error: 'Account not found. First time here? Switch to First-Time Sign Up with your phone number.',
        code: 'USER_NOT_FOUND',
      });
    }

    if (!verifySecret(password, existing.passwordSalt, existing.passwordHash)) {
      return res.status(401).json({ error: 'Incorrect password for this username.' });
    }

    const tokens = await issueTokens(existing);
    console.log(`[AUTH LOGIN] ${existing.username} (${existing.phone})`);
    res.json({ ok: true, isNew: false, ...tokens });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /auth/staff/login (Shared Kitchen & Owner login)
app.post('/auth/staff/login', async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '').trim();
    if (!username || !password) {
      return res.status(400).json({ error: 'Enter Kitchen / Owner ID and password.' });
    }

    const staff = await User.findOne({ usernameKey: `staff:${username.toLowerCase()}`, role: 'staff' });
    if (!staff || !verifySecret(password, staff.passwordSalt, staff.passwordHash)) {
      return res.status(401).json({ error: 'Invalid Kitchen / Owner credentials.' });
    }

    const tokens = await issueTokens(staff);
    console.log(`[STAFF LOGIN] ${staff.username}`);
    res.json({ ok: true, ...tokens });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /auth/refresh (Rotate refresh token & mint new access token)
app.post('/auth/refresh', async (req, res) => {
  try {
    const refreshToken = String(req.body?.refreshToken || '').trim();
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token missing', code: 'REFRESH_INVALID' });
    }

    const user = await User.findOne({ refreshTokenHash: hashToken(refreshToken) });
    if (!user || !user.refreshTokenExpiresAt || user.refreshTokenExpiresAt <= Date.now()) {
      if (user) {
        user.refreshTokenHash = '';
        user.refreshTokenExpiresAt = 0;
        await user.save();
      }
      return res.status(401).json({ error: 'Session expired — please sign in again', code: 'REFRESH_INVALID' });
    }

    const tokens = await issueTokens(user);
    res.json({ ok: true, ...tokens });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Middleware: requires valid signed JWT-style Access Token
function requireAuth(req, res, next) {
  const auth = String(req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) {
    return res.status(401).json({ error: 'Login required to continue', code: 'UNAUTHORIZED' });
  }
  const v = verifyAccessToken(token);
  if (!v.ok) {
    return res.status(401).json({
      error: v.expired ? 'Access token expired' : 'Invalid session token',
      code: v.expired ? 'TOKEN_EXPIRED' : 'UNAUTHORIZED',
    });
  }
  req.user = v.payload;
  next();
}

// Middleware: requires staff (Kitchen / Owner) role
function requireStaff(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'staff') {
      return res.status(403).json({ error: 'Kitchen & Owner access required', code: 'FORBIDDEN' });
    }
    next();
  });
}

// GET /auth/me
app.get('/auth/me', requireAuth, (req, res) => {
  res.json({ ok: true, user: req.user });
});

// POST /auth/logout (revokes refresh token)
app.post('/auth/logout', async (req, res) => {
  try {
    const refreshToken = String(req.body?.refreshToken || '').trim();
    if (refreshToken) {
      await User.updateOne(
        { refreshTokenHash: hashToken(refreshToken) },
        { $set: { refreshTokenHash: '', refreshTokenExpiresAt: 0 } }
      );
    } else {
      const auth = String(req.headers.authorization || '');
      const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
      const v = verifyAccessToken(token);
      if (v.ok && v.payload?.usernameKey) {
        await User.updateOne(
          { usernameKey: v.payload.usernameKey },
          { $set: { refreshTokenHash: '', refreshTokenExpiresAt: 0 } }
        );
      }
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /auth/staff/profile (fetch logged-in Kitchen & Owner profile from MongoDB)
app.get('/auth/staff/profile', requireStaff, async (req, res) => {
  try {
    const staff = await User.findOne({ usernameKey: req.user.usernameKey, role: 'staff' }).lean();
    if (!staff) return res.status(404).json({ error: 'Staff profile not found.' });
    res.json({ ok: true, user: safeUser(staff) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /auth/staff/profile (update Owner profile fields in MongoDB)
app.put('/auth/staff/profile', requireStaff, async (req, res) => {
  try {
    const body = req.body || {};
    const phone = String(body.phone || '').trim();
    const email = String(body.email || '').trim();

    if (phone && !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: 'Enter a valid 10-digit phone number.' });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }

    const patch = {
      fullName: String(body.fullName || '').trim().slice(0, 80),
      phone,
      email: email.slice(0, 100),
      canteenName: String(body.canteenName || '').trim().slice(0, 100),
      counterLocation: String(body.counterLocation || '').trim().slice(0, 120),
      upiId: String(body.upiId || '').trim().slice(0, 80),
      bio: String(body.bio || '').trim().slice(0, 240),
    };

    const updated = await User.findOneAndUpdate(
      { usernameKey: req.user.usernameKey, role: 'staff' },
      { $set: patch },
      { returnDocument: 'after' }
    ).lean();
    if (!updated) return res.status(404).json({ error: 'Staff account not found.' });

    console.log(`[STAFF PROFILE] Updated ${updated.username} (${updated.phone || 'no phone'})`);
    res.json({ ok: true, user: safeUser(updated) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /auth/staff/password (change Kitchen & Owner password & rotate tokens)
app.put('/auth/staff/password', requireStaff, async (req, res) => {
  try {
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Enter both current and new password.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const staff = await User.findOne({ usernameKey: req.user.usernameKey, role: 'staff' });
    if (!staff) return res.status(404).json({ error: 'Staff account not found.' });
    if (!verifySecret(currentPassword, staff.passwordSalt, staff.passwordHash)) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const { salt, hash } = hashSecret(newPassword);
    staff.passwordSalt = salt;
    staff.passwordHash = hash;
    const tokens = await issueTokens(staff);
    console.log(`[STAFF PASSWORD] Updated password for ${staff.username}`);
    res.json({ ok: true, ...tokens });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /auth/users (staff only, safe projection without hashes or refresh tokens)
app.get('/auth/users', requireStaff, async (req, res) => {
  try {
    const users = await User.find(
      {},
      { _id: 0, passwordHash: 0, passwordSalt: 0, refreshTokenHash: 0 }
    ).sort({ lastLoginAt: -1 }).lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------
// 1. MENU & INVENTORY APIS
// ---------------------------------------------------------------------

// GET /menu
app.get('/menu', async (req, res) => {
  try {
    const menu = await MenuItem.find({}, { _id: 0 }).lean();
    res.json(menu);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /menu
app.post('/menu', requireStaff, async (req, res) => {
  try {
    const item = req.body;
    const saved = await MenuItem.findOneAndUpdate(
      { id: item.id },
      { $set: item },
      { upsert: true, new: true, projection: { _id: 0 } }
    ).lean();
    res.json({ success: true, item: saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /menu/:id
app.delete('/menu/:id', requireStaff, async (req, res) => {
  try {
    await MenuItem.deleteOne({ id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------
// 1B. COMBO DEALS APIS
// ---------------------------------------------------------------------

// GET /combos
app.get('/combos', async (req, res) => {
  try {
    const combos = await Combo.find({}, { _id: 0 }).sort({ createdAt: 1 }).lean();
    res.json(combos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /combos (Create or update a combo)
app.post('/combos', requireStaff, async (req, res) => {
  try {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    const tagline = String(body.tagline || '').trim();
    const price = Number(body.price);
    const items = Array.isArray(body.items)
      ? body.items
          .filter((it) => it && String(it.id || '').trim() && Number(it.qty || 1) > 0)
          .map((it) => ({ id: String(it.id).trim(), qty: Math.max(1, Math.floor(Number(it.qty) || 1)) }))
      : [];

    if (!name) return res.status(400).json({ error: 'Combo name is required.' });
    if (!Number.isFinite(price) || price <= 0) return res.status(400).json({ error: 'Combo price must be greater than 0.' });
    if (items.length === 0) return res.status(400).json({ error: 'Select at least one menu item for the combo.' });

    const id = String(body.id || '').trim() || `combo-${Date.now()}`;
    const doc = {
      id,
      name,
      tagline,
      items,
      price,
      active: body.active !== false,
      createdAt: Number(body.createdAt) || Date.now(),
    };

    const saved = await Combo.findOneAndUpdate(
      { id },
      { $set: doc },
      { upsert: true, returnDocument: 'after', projection: { _id: 0 } }
    ).lean();
    res.json({ success: true, combo: saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /combos/:id
app.delete('/combos/:id', requireStaff, async (req, res) => {
  try {
    await Combo.deleteOne({ id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------
// 2. SLOTS, HOURS & CAPACITY APIS
// ---------------------------------------------------------------------

// GET /slots (public anonymized slot capacity & rush summary — no student PII)
app.get('/slots', async (req, res) => {
  try {
    const [doc, todayOrders] = await Promise.all([
      Settings.findById('canteen_config').lean(),
      Order.find({ day: 0 }, { _id: 0, slot: 1, status: 1, items: 1 }).lean(),
    ]);
    const s = { ...DEFAULT_SETTINGS, ...(doc || {}) };
    const DEAD_STATUSES = new Set(['cancelled', 'rejected', 'expired']);
    const ACTIVE_STATUSES = new Set(['confirmed', 'preparing', 'almost']);

    const slotCounts = {};
    const activeBySlot = {};
    let activeUnits = 0;

    for (const o of todayOrders) {
      if (!DEAD_STATUSES.has(o.status) && Number.isFinite(o.slot)) {
        slotCounts[o.slot] = (slotCounts[o.slot] || 0) + 1;
      }
      if (ACTIVE_STATUSES.has(o.status)) {
        if (Number.isFinite(o.slot)) {
          activeBySlot[o.slot] = (activeBySlot[o.slot] || 0) + 1;
        }
        for (const it of (o.items || [])) {
          activeUnits += Number(it.qty) || 0;
        }
      }
    }

    res.json({
      slots: [],
      caps: { def: s.def, overrides: s.overrides || {} },
      hours: { open: s.open, close: s.close },
      slotCounts,
      activeBySlot,
      activeUnits,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /slots/settings
app.put('/slots/settings', requireStaff, async (req, res) => {
  try {
    const doc = await Settings.findById('canteen_config').lean();
    const cur = { ...DEFAULT_SETTINGS, ...(doc || {}) };
    const body = req.body || {};
    const open = Number.isFinite(body.open) ? Math.max(0, Math.min(1410, body.open)) : cur.open;
    const close = Number.isFinite(body.close) ? Math.max(open + 30, Math.min(1680, body.close)) : Math.max(open + 30, cur.close);
    const def = Number.isFinite(body.def) ? Math.max(0, body.def) : cur.def;
    const overrides = body.overrides && typeof body.overrides === 'object' ? body.overrides : (cur.overrides || {});

    await Settings.findByIdAndUpdate(
      'canteen_config',
      { $set: { open, close, def, overrides } },
      { upsert: true }
    );
    console.log(`[SLOT SETTINGS] open=${open} close=${close} def=${def}`);
    res.json({ caps: { def, overrides }, hours: { open, close } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------
// 3. ORDERS API: BATCH PREP, PRE-ORDERS, ATOMIC STOCK & CANCELLATIONS
// ---------------------------------------------------------------------

const APPROVAL = { qty: 20, total: 500, waitMin: 15, expireMin: 30, preOrderMin: 60 };
const nowMin = () => new Date().getHours() * 60 + new Date().getMinutes();

// Parallel batch cooking time: max across items of ceil(qty / batchSize) * prep
const cookMinutes = (items, menu) => (items || []).reduce((max, i) => {
  const m = (menu || []).find((x) => x.id === i.id) || {};
  const prep = m.prep || 3;
  const batch = Math.max(1, m.batchSize || 4);
  return Math.max(max, Math.ceil(i.qty / batch) * prep);
}, 0);

const exceedsStock = (items, menu) => (items || []).some((i) => {
  const m = (menu || []).find((x) => x.id === i.id);
  return m && i.qty > m.stock;
});

const isFutureSlot = (slot, now) => Number.isFinite(slot) && slot - now > APPROVAL.preOrderMin;

function getCancelCutoff(order, menu) {
  const cook = order.cookMinutes || cookMinutes(order.items, menu);
  const cutoffMin = order.isPreOrder ? Math.max(APPROVAL.preOrderMin, cook) : cook;
  return { cook, cutoffMin };
}

// Applies inventory updates in MongoDB when an approved pre-order or counter-offer becomes active
async function applyInventoryMongo(order) {
  const nowMinutes = Number.isFinite(order.nowMin) ? order.nowMin : nowMin();
  const slotMinutes = typeof order.slot === 'number' ? order.slot : (order.slot ? parseInt(order.slot, 10) : nowMinutes + 15);
  const isFuturePipelineOrder = Boolean(order.isPreOrder || (slotMinutes - nowMinutes > APPROVAL.preOrderMin));
  let bulkCookAheadAlert = null;

  for (const itm of (order.items || [])) {
    const m = await MenuItem.findOne({ id: itm.id }).lean();
    if (!m) continue;

    if (!isFuturePipelineOrder) {
      const nextStock = Math.max(0, (m.stock || 0) - itm.qty);
      await MenuItem.updateOne(
        { id: itm.id },
        { $set: { stock: nextStock, available: nextStock > 0 } }
      );
    } else {
      const prepLeadMinutes = Math.min(45, (m.prep || 5) * 3 + 15);
      const prepStartMinutes = Math.max(nowMinutes, slotMinutes - prepLeadMinutes);
      const h = Math.floor(prepStartMinutes / 60) % 24;
      const mm = prepStartMinutes % 60;
      const prepStartTimeStr = `${h % 12 || 12}:${String(mm).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
      bulkCookAheadAlert = {
        itemId: m.id,
        itemName: m.name,
        qty: itm.qty,
        slotMinutes,
        prepStartTimeStr,
        message: `🔥 Bulk Cook-Ahead: ${itm.qty}x ${m.name} ordered for future pickup. Start frying fresh batch at ${prepStartTimeStr}. Current ready stock (${m.stock}) stays available for immediate walk-in students!`,
      };
      await BulkAlert.create(bulkCookAheadAlert);
    }
  }

  order.isFuturePipelineOrder = isFuturePipelineOrder;
  order.stockDeducted = !isFuturePipelineOrder;
  order.bulkCookAheadAlert = bulkCookAheadAlert;
}

function isOrderOwner(order, userPayload) {
  if (!order || !userPayload) return false;
  if (order.userId) return String(order.userId) === String(userPayload.sub);
  return Boolean(order.usernameKey && order.usernameKey === userPayload.usernameKey);
}

// GET /orders (authenticated: staff sees all canteen orders; students see ONLY their own orders)
app.get('/orders', requireAuth, async (req, res) => {
  try {
    const cutoffTs = Date.now() - APPROVAL.expireMin * 60000;
    await Order.updateMany(
      { status: 'pending_approval', createdAt: { $lt: cutoffTs } },
      { $set: { status: 'expired' }, $push: { history: { status: 'expired', at: Date.now() } } }
    );
    if (req.user.role === 'staff') {
      const orders = await Order.find({}, { _id: 0, mine: 0 }).sort({ createdAt: -1 }).lean();
      return res.json(orders);
    }
    const orders = await Order.find(
      {
        $or: [
          { userId: String(req.user.sub) },
          { userId: { $in: [null, ''] }, usernameKey: req.user.usernameKey },
        ],
      },
      { _id: 0, mine: 0 }
    ).sort({ createdAt: -1 }).lean();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /orders (authenticated users — stamps userId, name, rollNo, and phone strictly from verified token)
app.post('/orders', requireAuth, async (req, res) => {
  try {
    const { mine: _dropMine, ...order } = req.body || {};
    const menu = await MenuItem.find({}, { _id: 0 }).lean();
    const nowVal = Number.isFinite(order.nowMin) ? order.nowMin : nowMin();
    const slotNum = Number(order.slot);
    const isOverStock = exceedsStock(order.items, menu);
    const isFuture = isFutureSlot(slotNum, nowVal);
    const isExplicitPreOrder = Boolean(order.isPreOrderRequest);

    // Atomic conditional stock decrement for immediate regular checkouts
    if (!isExplicitPreOrder && !isFuture) {
      const decremented = [];
      let conflictItem = null;

      for (const itm of (order.items || [])) {
        const updated = await MenuItem.findOneAndUpdate(
          { id: itm.id, available: true, stock: { $gte: itm.qty } },
          { $inc: { stock: -itm.qty } },
          { new: true }
        ).lean();

        if (!updated) {
          conflictItem = itm;
          break;
        }
        decremented.push({ id: itm.id, qty: itm.qty, newStock: updated.stock });
      }

      if (conflictItem) {
        // Roll back any earlier items decremented in this order
        for (const d of decremented) {
          await MenuItem.updateOne(
            { id: d.id },
            { $inc: { stock: d.qty }, $set: { available: true } }
          );
        }
        const freshMenu = await MenuItem.find({}, { _id: 0 }).lean();
        const m = freshMenu.find((x) => x.id === conflictItem.id);
        const avail = m ? m.stock : 0;
        return res.status(409).json({
          error: avail > 0
            ? `Only ${avail} left of ${m.name} — someone just ordered it`
            : `${m ? m.name : conflictItem.name} just sold out`,
          code: 'STOCK_CONFLICT',
          itemId: conflictItem.id,
          availableStock: avail,
          menu: freshMenu,
        });
      }

      // Mark items at 0 stock as unavailable
      for (const d of decremented) {
        if (d.newStock <= 0) {
          await MenuItem.updateOne({ id: d.id, stock: { $lte: 0 } }, { $set: { available: false } });
        }
      }
    }

    const requiresApproval = isOverStock || isFuture;
    const cook = cookMinutes(order.items, menu);
    const status = requiresApproval ? 'pending_approval' : 'preparing';

    let orderId = String(order.id || '').trim();
    if (!orderId || await Order.exists({ id: orderId })) {
      do {
        orderId = `YR-${crypto.randomBytes(3).toString('hex').slice(0, 4).toUpperCase()}`;
      } while (await Order.exists({ id: orderId }));
    }

    const newOrder = {
      ...order,
      id: orderId,
      userId: String(req.user.sub),
      name: req.user.username,
      rollNo: req.user.rollNo,
      usernameKey: req.user.usernameKey,
      phone: req.user.phone,
      day: 0,
      nowMin: nowVal,
      createdAt: Date.now(),
      status,
      requiresApproval,
      isPreOrderRequest: isExplicitPreOrder,
      exceedsStock: isOverStock,
      cookMinutes: cook,
      suggestedSlot: Math.ceil((nowVal + cook) / 15) * 15,
      isPreOrder: isFuture,
      approvalDeadline: requiresApproval ? Date.now() + APPROVAL.waitMin * 60000 : null,
      isFuturePipelineOrder: false,
      stockDeducted: !requiresApproval,
      bulkCookAheadAlert: null,
      history: [{ status, at: Date.now() }],
    };

    await Order.create(newOrder);
    console.log(`[ORDER PLACED] ${newOrder.id} - Total: ₹${newOrder.total} - ${requiresApproval ? 'AWAITING OWNER APPROVAL' : 'READY STOCK DEDUCTED'}`);
    res.status(201).json(newOrder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Owner decision on a pre-order: approve | reject | counter
app.post('/orders/:id/decision', requireStaff, async (req, res) => {
  try {
    const { action, slot } = req.body || {};
    const order = await Order.findOne({ id: req.params.id });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (!['pending_approval', 'expired'].includes(order.status)) {
      return res.status(409).json({ error: 'Order is not awaiting approval' });
    }

    if (action === 'approve') {
      order.status = 'preparing';
      await applyInventoryMongo(order);
    } else if (action === 'reject') {
      order.status = 'rejected';
    } else if (action === 'counter' && Number.isFinite(slot)) {
      order.status = 'counter_offer';
      order.proposedSlot = slot;
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    order.history = order.history || [];
    order.history.push({ status: order.status, at: Date.now() });
    await order.save();

    console.log(`[OWNER DECISION] ${order.id} -> ${order.status}`);
    const out = order.toObject();
    delete out._id;
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Student answer to owner's counter-offer (owner-only check)
app.post('/orders/:id/respond', requireAuth, async (req, res) => {
  try {
    const { accept } = req.body || {};
    const order = await Order.findOne({ id: req.params.id });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (req.user.role !== 'staff' && !isOrderOwner(order, req.user)) {
      return res.status(403).json({ error: 'Not authorized to access this order', code: 'FORBIDDEN' });
    }
    if (order.status !== 'counter_offer') return res.status(409).json({ error: 'No pending offer' });

    if (accept) {
      order.slot = order.proposedSlot;
      order.status = 'preparing';
      await applyInventoryMongo(order);
    } else {
      order.status = 'cancelled';
    }

    order.history = order.history || [];
    order.history.push({ status: order.status, at: Date.now() });
    await order.save();

    const out = order.toObject();
    delete out._id;
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Student request to cancel an order (owner-only check)
app.post('/orders/:id/cancel-request', requireAuth, async (req, res) => {
  try {
    const order = await Order.findOne({ id: req.params.id });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (req.user.role !== 'staff' && !isOrderOwner(order, req.user)) {
      return res.status(403).json({ error: 'Not authorized to access this order', code: 'FORBIDDEN' });
    }

    if (['pending_approval', 'counter_offer'].includes(order.status)) {
      order.status = 'cancelled';
      order.history = order.history || [];
      order.history.push({ status: 'cancelled', at: Date.now() });
      await order.save();
      const out = order.toObject();
      delete out._id;
      return res.json(out);
    }

    if (['preparing', 'confirmed'].includes(order.status)) {
      const menu = await MenuItem.find({}, { _id: 0 }).lean();
      const nowVal = Number.isFinite(req.body?.now) ? req.body.now : nowMin();
      const { cutoffMin } = getCancelCutoff(order, menu);
      if (order.slot - nowVal < cutoffMin) {
        return res.status(400).json({ error: 'Past cancellation cutoff — cooking window has started' });
      }
      order.prevStatus = order.status;
      order.status = 'cancel_requested';
      order.cancelRequestedAt = Date.now();
      order.cancelDeadline = Date.now() + APPROVAL.waitMin * 60000;
      order.cancelRejected = false;
      if (req.body?.phone && /^\d{10}$/.test(String(req.body.phone).trim()) && !order.phone) {
        order.phone = String(req.body.phone).trim();
      }
      order.history = order.history || [];
      order.history.push({ status: 'cancel_requested', at: Date.now() });
      await order.save();

      console.log(`[CANCEL REQUESTED] ${order.id} (slot ${order.slot}, now ${nowVal}, cutoff ${cutoffMin})`);
      const out = order.toObject();
      delete out._id;
      return res.json(out);
    }

    return res.status(409).json({ error: 'Order cannot be cancelled at this stage' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Owner decision on a student's cancellation request: approve | reject
app.post('/orders/:id/cancel-decision', requireStaff, async (req, res) => {
  try {
    const { action } = req.body || {};
    const order = await Order.findOne({ id: req.params.id });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'cancel_requested') {
      return res.status(409).json({ error: 'Order does not have a pending cancellation request' });
    }

    if (action === 'approve') {
      order.status = 'cancelled';
      if (order.stockDeducted || (!order.isFuturePipelineOrder && order.stockDeducted !== false)) {
        for (const itm of (order.items || [])) {
          await MenuItem.updateOne(
            { id: itm.id },
            { $inc: { stock: itm.qty }, $set: { available: true } }
          );
        }
        order.stockDeducted = false;
      }
    } else if (action === 'reject') {
      order.status = order.prevStatus || 'preparing';
      order.cancelRejected = true;
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    order.history = order.history || [];
    order.history.push({ status: order.status, at: Date.now() });
    await order.save();

    console.log(`[CANCEL DECISION] ${order.id} -> ${order.status}`);
    const out = order.toObject();
    delete out._id;
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /kitchen/bulk-alerts
app.get('/kitchen/bulk-alerts', requireStaff, async (req, res) => {
  try {
    const alerts = await BulkAlert.find({}, { _id: 0 }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, alerts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /orders/:id/status
app.patch('/orders/:id/status', requireStaff, async (req, res) => {
  try {
    const { status } = req.body || {};
    const order = await Order.findOneAndUpdate(
      { id: req.params.id },
      { $set: { status }, $push: { history: { status, at: Date.now() } } },
      { new: true, projection: { _id: 0 } }
    ).lean();
    if (!order) {
      return res.status(404).json({ error: 'Order not found in database' });
    }
    console.log(`[STATUS UPDATED] ${order.id} is now ${status}`);
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /demand/missed
app.post('/demand/missed', async (req, res) => {
  try {
    const rec = req.body;
    await MissedDemand.create(rec);
    res.status(201).json({ success: true, rec });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /demand/insights (staff only)
app.get('/demand/insights', requireStaff, async (req, res) => {
  try {
    const [missed, orders, menu, bulkAlerts] = await Promise.all([
      MissedDemand.find({}, { _id: 0 }).sort({ ts: -1 }).lean(),
      Order.find({}, { _id: 0 }).sort({ createdAt: -1 }).lean(),
      MenuItem.find({}, { _id: 0 }).lean(),
      BulkAlert.find({}, { _id: 0 }).sort({ createdAt: -1 }).lean(),
    ]);
    res.json({
      success: true,
      missed,
      orders,
      menu,
      bulkAlerts,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /demo/reset
app.post('/demo/reset', requireStaff, async (req, res) => {
  try {
    const fresh = await resetDatabase();
    res.json({ success: true, message: 'MongoDB reset.', data: fresh });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`OrderQuick API running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB startup failed:', err.message);
    process.exit(1);
  });
