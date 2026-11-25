// server.js - CanteenIQ Single Counter, Dynamic Slots & Time Expiry Backend
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Load 30-day analytics data if available
let analyticsHistory = null;
const analyticsPath = path.join(__dirname, 'data', 'analytics.json');
try {
  analyticsHistory = require(analyticsPath);
} catch (e) {
  analyticsHistory = { peakSlots: [], topItemsOverall: [], predictions: [] };
}

// Helper: Calculate current time in minutes (supports simulatedTime for testing)
function getCurrentTimeMinutes(data) {
  if (data.simulatedTime) {
    const [h, m] = data.simulatedTime.split(':').map(Number);
    return h * 60 + m;
  }
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

// ---------------------------------------------------------------------
// 1. STUDENT APIS
// ---------------------------------------------------------------------

// GET Menu with Stock Availability, Popular Flags & Stock Alerts
app.get('/api/student/menu', (req, res) => {
  const data = db.read();
  const menuWithAlerts = data.menu.map(item => ({
    ...item,
    inStock: item.stock > 0,
    lowStock: item.stock > 0 && item.stock <= 5,
    stockStatusMessage: item.stock === 0 
      ? 'Out of Stock' 
      : (item.stock <= 10 ? `Only ${item.stock} left out of ${item.totalInitial}!` : 'In Stock')
  }));

  res.json({
    success: true,
    data: menuWithAlerts
  });
});

// GET All 15-Minute Slots (10 AM to 5 PM) with Real-Time Expiry & Capacity (Max 20)
app.get('/api/student/slots', (req, res) => {
  const data = db.read();
  const currentMinutes = getCurrentTimeMinutes(data);

  const evaluatedSlots = data.slots.map(slot => {
    const isPast = slot.endMinutes <= currentMinutes;
    const isCurrentActive = currentMinutes >= slot.startMinutes && currentMinutes < slot.endMinutes;
    const spotsLeft = slot.capacity - slot.booked;
    const isFull = spotsLeft <= 0;

    let status = 'Available';
    let canBook = true;

    if (isPast) {
      status = 'EXPIRED (Time Passed)';
      canBook = false;
    } else if (isFull) {
      status = 'FULL (20/20 Booked)';
      canBook = false;
    } else if (spotsLeft <= 5) {
      status = `FAST FILLING (${spotsLeft} spots left)`;
    }

    return {
      id: slot.id,
      label: slot.label,
      startMinutes: slot.startMinutes,
      endMinutes: slot.endMinutes,
      capacity: slot.capacity,
      booked: slot.booked,
      spotsLeft: Math.max(0, spotsLeft),
      isPast,
      isCurrentActive,
      isFull,
      canBook,
      status,
      isLunchPeak: slot.isLunchPeak
    };
  });

  res.json({
    success: true,
    currentTime: data.simulatedTime || 'Live Clock',
    currentTimeMinutes: currentMinutes,
    slots: evaluatedSlots
  });
});

// GET Recommendations for Out-of-Stock items
app.get('/api/student/recommendations/:itemId', (req, res) => {
  const data = db.read();
  const targetItem = data.menu.find(m => m.id === req.params.itemId);
  if (!targetItem) {
    return res.status(404).json({ success: false, message: 'Item not found' });
  }

  // Record unmet demand for AI refill analytics
  data.unmetDemand[targetItem.id] = (data.unmetDemand[targetItem.id] || 0) + 1;
  db.save(data);

  // Find alternative items in same category with stock > 0
  const alternatives = data.menu.filter(m => 
    m.id !== targetItem.id && 
    m.category === targetItem.category && 
    m.stock > 0
  );

  res.json({
    success: true,
    targetItem: targetItem.name,
    message: `${targetItem.name} is currently out of stock! Try these chef-recommended alternatives:`,
    alternatives
  });
});

// POST Place Order (Time Verification + Capacity 20 Enforcement + Atomic Stock)
app.post('/api/student/orders', (req, res) => {
  const { studentName, items, requestedSlotId } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Cart cannot be empty.' });
  }

  const data = db.read();
  const currentMinutes = getCurrentTimeMinutes(data);

  // 1. ATOMIC STOCK VERIFICATION
  for (const itm of items) {
    const menuItem = data.menu.find(m => m.id === itm.id);
    if (!menuItem) {
      return res.status(404).json({ success: false, message: `Item ${itm.id} not found.` });
    }
    if (menuItem.stock < itm.quantity) {
      data.unmetDemand[menuItem.id] = (data.unmetDemand[menuItem.id] || 0) + itm.quantity;
      db.save(data);

      const alternatives = data.menu.filter(m => m.category === menuItem.category && m.stock > 0 && m.id !== menuItem.id);

      return res.status(409).json({
        success: false,
        code: 'OUT_OF_STOCK',
        message: `Only ${menuItem.stock} pcs of '${menuItem.name}' left in stock! You requested ${itm.quantity}.`,
        availableStock: menuItem.stock,
        alternatives
      });
    }
  }

  // 2. TIME & CAPACITY VERIFICATION
  let targetSlot = data.slots.find(s => s.id === requestedSlotId);
  if (!targetSlot) {
    return res.status(400).json({ success: false, message: 'Invalid slot selected.' });
  }

  // RULE A: Check if slot time has already passed
  if (targetSlot.endMinutes <= currentMinutes) {
    // Find next upcoming available slot
    const nextValidSlot = data.slots.find(s => s.endMinutes > currentMinutes && s.booked < s.capacity);
    return res.status(400).json({
      success: false,
      code: 'SLOT_EXPIRED',
      message: `The slot '${targetSlot.label}' has already expired! You cannot book past time.`,
      nextAvailableSlot: nextValidSlot || null
    });
  }

  let shiftedToNextSlot = false;
  let originalSlotLabel = targetSlot.label;

  // RULE B: Capacity limit 20 per slot
  if (targetSlot.booked >= targetSlot.capacity) {
    // Automatically find the very next upcoming slot that has capacity
    const nextSlot = data.slots.find(s => s.endMinutes > currentMinutes && s.booked < s.capacity && s.startMinutes >= targetSlot.endMinutes);
    
    if (!nextSlot) {
      return res.status(409).json({
        success: false,
        code: 'ALL_UPCOMING_SLOTS_FULL',
        message: 'All upcoming pickup slots for today are 100% full!'
      });
    }

    targetSlot = nextSlot;
    shiftedToNextSlot = true;
  }

  // 3. DEDUCT STOCK & INCREMENT SLOT BOOKING
  let totalAmount = 0;
  let maxPrepTime = 5;

  items.forEach(itm => {
    const menuItem = data.menu.find(m => m.id === itm.id);
    menuItem.stock -= itm.quantity;
    totalAmount += menuItem.price * itm.quantity;
    if (menuItem.prepTimeMins > maxPrepTime) maxPrepTime = menuItem.prepTimeMins;
  });

  targetSlot.booked += 1;

  // 4. GENERATE TICKET & ESTIMATED TIME (Single Counter)
  const tokenNumber = data.orders.length + 101;
  const estimatedMins = Math.min(15, Math.ceil(targetSlot.booked * 0.7) + maxPrepTime);

  const newOrder = {
    orderId: `ORD-${tokenNumber}`,
    token: `T-${tokenNumber}`,
    studentName: studentName || 'Student',
    items,
    totalAmount,
    slotId: targetSlot.id,
    slotLabel: targetSlot.label,
    counterName: 'Main Canteen Counter',
    status: 'Placed', // Placed -> Preparing -> Ready -> Completed
    estimatedMins,
    createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  data.orders.unshift(newOrder);
  db.save(data);

  res.status(201).json({
    success: true,
    message: shiftedToNextSlot 
      ? `Slot '${originalSlotLabel}' was completely full (20/20)! Your order has been placed in the next slot '${targetSlot.label}'.` 
      : 'Your order has been placed successfully!',
    shiftedToNextSlot,
    order: newOrder
  });
});

// GET Student Live Order Status & Tracking (Blinkit style)
app.get('/api/student/track/:orderId', (req, res) => {
  const data = db.read();
  const order = data.orders.find(o => o.orderId === req.params.orderId || o.token === req.params.orderId);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  let timeRemainingText = '';
  if (order.status === 'Placed') timeRemainingText = `~${order.estimatedMins} mins (Order in queue for ${order.slotLabel})`;
  else if (order.status === 'Preparing') timeRemainingText = `~${Math.max(2, Math.floor(order.estimatedMins / 2))} mins (Kitchen is preparing your items)`;
  else if (order.status === 'Ready') timeRemainingText = 'Ready! Please collect at Main Counter';
  else if (order.status === 'Completed') timeRemainingText = 'Collected. Thank you!';

  res.json({
    success: true,
    order: {
      ...order,
      timeRemainingText
    }
  });
});

// ---------------------------------------------------------------------
// 2. KITCHEN DASHBOARD API
// ---------------------------------------------------------------------

// GET Kitchen Live Orders Feed
app.get('/api/kitchen/feed', (req, res) => {
  const data = db.read();

  // Aggregate items that need to be cooked right now for active orders
  const productionSummary = {};
  data.orders
    .filter(o => o.status === 'Placed' || o.status === 'Preparing')
    .forEach(o => {
      o.items.forEach(itm => {
        productionSummary[itm.name] = (productionSummary[itm.name] || 0) + itm.quantity;
      });
    });

  res.json({
    success: true,
    activeOrdersCount: data.orders.filter(o => o.status !== 'Completed').length,
    orders: data.orders,
    productionSummary
  });
});

// PATCH Update Kitchen Order Status (Placed -> Preparing -> Ready -> Completed)
app.patch('/api/kitchen/orders/:orderId/status', (req, res) => {
  const { status } = req.body;
  const validStatuses = ['Placed', 'Preparing', 'Ready', 'Completed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status update.' });
  }

  const data = db.read();
  const order = data.orders.find(o => o.orderId === req.params.orderId);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  order.status = status;
  db.save(data);

  res.json({
    success: true,
    message: `Order ${order.orderId} marked as ${status}`,
    order
  });
});

// ---------------------------------------------------------------------
// 3. OWNER / ANALYTICS DASHBOARD API
// ---------------------------------------------------------------------

// GET Owner Dashboard & AI Refill Prediction Engine
app.get('/api/owner/analytics', (req, res) => {
  const data = db.read();

  let todayTotalRevenue = 0;
  let todayTotalOrders = data.orders.length;
  const itemSalesToday = {};

  data.menu.forEach(m => {
    itemSalesToday[m.id] = {
      id: m.id,
      name: m.name,
      category: m.category,
      price: m.price,
      initialStock: m.totalInitial,
      currentStock: m.stock,
      soldToday: m.totalInitial - m.stock,
      unmetDemand: data.unmetDemand[m.id] || 0
    };
    todayTotalRevenue += (m.totalInitial - m.stock) * m.price;
  });

  // AI Refill Prediction Formula
  const aiRefillRecommendations = Object.values(itemSalesToday).map(item => {
    const totalExpressedDemand = item.soldToday + item.unmetDemand;
    const safetyBuffer = Math.ceil(totalExpressedDemand * 0.25);
    const recommendedRefillTomorrow = Math.max(item.initialStock, totalExpressedDemand + safetyBuffer);

    let advice = '';
    if (item.unmetDemand > 0) {
      advice = `⚠️ High Deficit: Today ${item.soldToday} sold and ${item.unmetDemand} students turned down. AI recommends ${recommendedRefillTomorrow} units tomorrow (+${safetyBuffer} buffer).`;
    } else if (item.currentStock > item.initialStock * 0.6) {
      advice = `🟢 Slow Moving: ${item.currentStock} unsold. Reduce batch size tomorrow.`;
    } else {
      advice = `Balanced: Prep standard batch of ${recommendedRefillTomorrow} units tomorrow.`;
    }

    return {
      itemId: item.id,
      name: item.name,
      category: item.category,
      initialStockToday: item.initialStock,
      soldToday: item.soldToday,
      currentStockRemaining: item.currentStock,
      unmetDemandTurnedDown: item.unmetDemand,
      totalActualDemand: totalExpressedDemand,
      aiRecommendedTomorrow: recommendedRefillTomorrow,
      advice
    };
  });

  res.json({
    success: true,
    summary: {
      todayTotalOrders,
      todayTotalRevenue,
      peakWindow: '1:00 PM - 1:15 PM',
      popularItems: data.menu.filter(m => m.isPopular).map(m => m.name)
    },
    aiRefillRecommendations,
    past30DaysHistory: analyticsHistory
  });
});

// POST Set Simulated Time (Helps testing past vs future slots)
app.post('/api/demo/set-time', (req, res) => {
  const { time } = req.body; // e.g. "13:05" for 1:05 PM or null for live clock
  const data = db.read();
  data.simulatedTime = time;
  db.save(data);
  res.json({ success: true, message: `Clock set to ${time || 'System Real Time'}` });
});

// POST Reset Demo Data
app.post('/api/demo/reset', (req, res) => {
  const fresh = db.reset();
  res.json({ success: true, message: 'Local database reset to demo baseline.', data: fresh });
});

// Start Server
app.listen(PORT, () => {
  console.log(`CanteenIQ Single-Counter Backend listening on port ${PORT}`);
});
