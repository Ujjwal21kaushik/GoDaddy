// backend/server.js - Robust Real-Time API with Dual-Bucket Ready vs Pipeline Stock
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Load 30-day analytics data if present
let analyticsHistory = null;
const analyticsPath = path.join(__dirname, 'data', 'analytics.json');
try {
  analyticsHistory = require(analyticsPath);
} catch (e) {
  analyticsHistory = { peakSlots: [], topItemsOverall: [], predictions: [] };
}

// ---------------------------------------------------------------------
// 1. MENU & INVENTORY APIS
// ---------------------------------------------------------------------

// GET /menu
app.get('/menu', (req, res) => {
  const data = db.read();
  res.json(data.menu || []);
});

// POST /menu
app.post('/menu', (req, res) => {
  const item = req.body;
  const data = db.read();
  const exists = data.menu.find(m => m.id === item.id);
  if (exists) {
    Object.assign(exists, item);
  } else {
    data.menu.push(item);
  }
  db.save(data);
  res.json({ success: true, item });
});

// ---------------------------------------------------------------------
// 2. SLOTS & CAPACITY APIS
// ---------------------------------------------------------------------

// GET /slots
app.get('/slots', (req, res) => {
  const data = db.read();
  const caps = { def: 20, overrides: {} };
  (data.slots || []).forEach(s => {
    caps.overrides[s.label] = s.capacity || 20;
  });
  res.json({ slots: data.slots || [], caps });
});

// ---------------------------------------------------------------------
// 3. ORDERS API: DUAL-BUCKET LOGIC (READY STOCK vs COOK-AHEAD PIPELINE)
// ---------------------------------------------------------------------

// GET /orders
app.get('/orders', (req, res) => {
  const data = db.read();
  res.json(data.orders || []);
});

// POST /orders
app.post('/orders', (req, res) => {
  const order = req.body;
  const data = db.read();

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const slotMinutes = typeof order.slot === 'number' ? order.slot : (order.slot ? parseInt(order.slot, 10) : nowMinutes + 15);
  const minutesUntilSlot = slotMinutes - nowMinutes;

  // DUAL-BUCKET EDGE CASE RULE:
  // If order is more than 45 minutes in the future, it is a "Cook-Ahead Pipeline Order".
  // It does NOT lock current immediate ready stock on the counter!
  const isFuturePipelineOrder = minutesUntilSlot > 45;

  let bulkCookAheadAlert = null;

  if (order.items && Array.isArray(order.items)) {
    order.items.forEach(itm => {
      const m = data.menu.find(x => x.id === itm.id);
      if (m) {
        if (!isFuturePipelineOrder) {
          // Immediate Order (<= 45 mins): Deduct from counter ready stock
          m.stock = Math.max(0, m.stock - itm.qty);
          if (m.stock === 0) m.available = false;
        } else {
          // Future Order (> 45 mins): Register bulk kitchen production task!
          const prepLeadMinutes = Math.min(45, (m.prep || 5) * 3 + 15);
          const prepStartMinutes = Math.max(nowMinutes, slotMinutes - prepLeadMinutes);
          const prepStartH = Math.floor(prepStartMinutes / 60) % 24;
          const prepStartM = prepStartMinutes % 60;
          const prepStartTimeStr = `${prepStartH % 12 || 12}:${String(prepStartM).padStart(2, '0')} ${prepStartH >= 12 ? 'PM' : 'AM'}`;

          bulkCookAheadAlert = {
            itemId: m.id,
            itemName: m.name,
            qty: itm.qty,
            slotMinutes,
            prepStartTimeStr,
            message: `🔥 Bulk Cook-Ahead: ${itm.qty}x ${m.name} ordered for future pickup. Start frying fresh batch at ${prepStartTimeStr}. Current ready stock (${m.stock}) stays available for immediate walk-in students!`
          };
        }
      }
    });
  }

  const newOrder = {
    ...order,
    id: order.id || `YR-${Math.floor(Math.random() * 9000 + 1000)}`,
    day: 0,
    createdAt: Date.now(),
    status: order.status || 'confirmed',
    isFuturePipelineOrder,
    bulkCookAheadAlert,
    history: [{ status: order.status || 'confirmed', at: Date.now() }]
  };

  if (!data.orders) data.orders = [];
  data.orders.unshift(newOrder);

  if (bulkCookAheadAlert) {
    if (!data.bulkAlerts) data.bulkAlerts = [];
    data.bulkAlerts.unshift(bulkCookAheadAlert);
  }

  db.save(data);

  console.log(`[ORDER PLACED] ${newOrder.id} - Total: ₹${newOrder.total} - ${isFuturePipelineOrder ? 'PIPELINE (Stock Protected)' : 'READY STOCK DEDUCTED'}`);
  res.status(201).json(newOrder);
});

// GET /kitchen/bulk-alerts
app.get('/kitchen/bulk-alerts', (req, res) => {
  const data = db.read();
  res.json({ success: true, alerts: data.bulkAlerts || [] });
});

// PATCH /orders/:id/status
app.patch('/orders/:id/status', (req, res) => {
  const { status } = req.body;
  const data = db.read();
  const order = data.orders.find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found in database' });
  }

  order.status = status;
  if (!order.history) order.history = [];
  order.history.push({ status, at: Date.now() });
  db.save(data);

  console.log(`[STATUS UPDATED] ${order.id} is now ${status}`);
  res.json(order);
});

// POST /demand/missed
app.post('/demand/missed', (req, res) => {
  const rec = req.body;
  const data = db.read();
  if (!data.missed) data.missed = [];
  data.missed.unshift(rec);
  db.save(data);
  res.status(201).json({ success: true, rec });
});

// GET /demand/insights
app.get('/demand/insights', (req, res) => {
  const data = db.read();
  res.json({
    success: true,
    missed: data.missed || [],
    orders: data.orders || [],
    menu: data.menu || [],
    bulkAlerts: data.bulkAlerts || [],
    analyticsHistory
  });
});

// POST /demo/reset
app.post('/demo/reset', (req, res) => {
  const fresh = db.reset();
  res.json({ success: true, message: 'Database reset.', data: fresh });
});

app.listen(PORT, () => {
  console.log(`CanteenIQ Live Database Server running on http://localhost:${PORT}`);
});
