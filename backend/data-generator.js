// data-generator.js - Generates 30 days of realistic canteen orders and computes required analytics
const fs = require('fs');
const path = require('path');

const MENU_ITEMS = [
  { id: 'm1', name: 'Samosa (2 pcs)', category: 'Snack', price: 25, baseDailyDemand: 80, prepTimeMins: 15 },
  { id: 'm2', name: 'Kachori with Chutney', category: 'Snack', price: 25, baseDailyDemand: 45, prepTimeMins: 15 },
  { id: 'm3', name: 'Aloo Patty', category: 'Snack', price: 20, baseDailyDemand: 50, prepTimeMins: 10 },
  { id: 'm4', name: 'Veg Grilled Sandwich', category: 'Meal', price: 50, baseDailyDemand: 35, prepTimeMins: 8 },
  { id: 'm5', name: 'Special Masala Maggi', category: 'Meal', price: 40, baseDailyDemand: 55, prepTimeMins: 7 },
  { id: 'm6', name: 'Chole Kulche Combo', category: 'Meal', price: 65, baseDailyDemand: 40, prepTimeMins: 12 },
  { id: 'm7', name: 'Cold Coffee with Ice Cream', category: 'Beverage', price: 45, baseDailyDemand: 60, prepTimeMins: 5 },
  { id: 'm8', name: 'Masala Chai', category: 'Beverage', price: 15, baseDailyDemand: 95, prepTimeMins: 5 },
  { id: 'm9', name: 'Paneer Roll', category: 'Meal', price: 60, baseDailyDemand: 30, prepTimeMins: 10 },
  { id: 'm10', name: 'Bread Pakora', category: 'Snack', price: 20, baseDailyDemand: 25, prepTimeMins: 12 }
];

const TIME_SLOTS = [
  { slot: '12:30 - 12:45', weight: 0.15 },
  { slot: '12:45 - 13:00', weight: 0.35 },
  { slot: '13:00 - 13:15', weight: 1.00 }, // PEAK RUSH
  { slot: '13:15 - 13:30', weight: 0.85 },
  { slot: '13:30 - 13:45', weight: 0.40 },
  { slot: '13:45 - 14:00', weight: 0.20 }
];

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function generateOrders() {
  const orders = [];
  const today = new Date();
  
  for (let d = 30; d >= 1; d--) {
    const orderDate = new Date(today);
    orderDate.setDate(today.getDate() - d);
    const dayOfWeek = DAYS_OF_WEEK[orderDate.getDay()];
    
    // Weekend low traffic multiplier
    const dayMultiplier = (dayOfWeek === 'Sunday' || dayOfWeek === 'Saturday') ? 0.3 : 1.0;
    // Friday high rush multiplier
    const fridayMultiplier = (dayOfWeek === 'Friday') ? 1.25 : 1.0;

    TIME_SLOTS.forEach(slotObj => {
      MENU_ITEMS.forEach(item => {
        // Compute realistic random orders count for this slot
        const expectedOrders = Math.floor(
          (item.baseDailyDemand / 6) * slotObj.weight * dayMultiplier * fridayMultiplier * (0.8 + Math.random() * 0.4)
        );

        for (let i = 0; i < expectedOrders; i++) {
          const qty = Math.random() < 0.7 ? 1 : (Math.random() < 0.9 ? 2 : 3);
          const orderId = `ORD-${orderDate.toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
          
          orders.push({
            orderId,
            itemId: item.id,
            itemName: item.name,
            category: item.category,
            quantity: qty,
            price: item.price,
            totalAmount: qty * item.price,
            date: orderDate.toISOString().slice(0, 10),
            dayOfWeek,
            pickupSlot: slotObj.slot
          });
        }
      });
    });
  }
  return orders;
}

function analyzeData(orders) {
  // 1. Total sales and quantity by item
  const itemStats = {};
  MENU_ITEMS.forEach(item => {
    itemStats[item.id] = { id: item.id, name: item.name, totalSold: 0, revenue: 0, category: item.category };
  });

  // 2. Peak 15-minute slot analysis
  const slotCount = {};
  TIME_SLOTS.forEach(s => slotCount[s.slot] = 0);

  // 3. Top items by Day of Week
  const dayStats = {};
  DAYS_OF_WEEK.forEach(day => {
    dayStats[day] = {};
    MENU_ITEMS.forEach(item => { dayStats[day][item.name] = 0; });
  });

  orders.forEach(ord => {
    if (itemStats[ord.itemId]) {
      itemStats[ord.itemId].totalSold += ord.quantity;
      itemStats[ord.itemId].revenue += ord.totalAmount;
    }
    slotCount[ord.pickupSlot] = (slotCount[ord.pickupSlot] || 0) + ord.quantity;
    if (dayStats[ord.dayOfWeek]) {
      dayStats[ord.dayOfWeek][ord.itemName] = (dayStats[ord.dayOfWeek][ord.itemName] || 0) + ord.quantity;
    }
  });

  // Sort slots by busiest
  const peakSlots = Object.entries(slotCount).sort((a, b) => b[1] - a[1]);

  // Top 5 items overall
  const topItemsOverall = Object.values(itemStats).sort((a, b) => b.totalSold - a.totalSold).slice(0, 5);

  // Top 5 items by day of the week
  const topItemsByDay = {};
  DAYS_OF_WEEK.forEach(day => {
    topItemsByDay[day] = Object.entries(dayStats[day])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  });

  // 4. Waste & Prediction analysis (e.g., Samosa vs Sandwich)
  const predictions = MENU_ITEMS.map(item => {
    const avgDailySold = Math.round(itemStats[item.id].totalSold / 30);
    const predictedDemand = Math.round(avgDailySold * 1.05); // slight momentum
    const currentStock = Math.floor(avgDailySold * 0.2); // 20% in fridge
    const safetyBuffer = Math.round(avgDailySold * 0.15); // 15% buffer
    const recommendedPrep = Math.max(0, predictedDemand + safetyBuffer - currentStock);
    
    // Simulate waste pattern (fresh meals spoil quicker)
    const avgPrepared = Math.round(avgDailySold * 1.2);
    const avgWasted = Math.max(0, avgPrepared - avgDailySold);
    const wasteRatePercent = ((avgWasted / avgPrepared) * 100).toFixed(1);

    return {
      itemId: item.id,
      name: item.name,
      category: item.category,
      avgDailySold,
      predictedDemand,
      currentStock,
      safetyBuffer,
      recommendedPrep,
      avgPrepared,
      avgWasted,
      wasteRatePercent,
      reason: `Historical avg daily sale is ${avgDailySold}. Factoring +15% safety buffer and existing ${currentStock} usable stock.`
    };
  });

  return {
    totalOrdersGenerated: orders.length,
    peakSlots,
    topItemsOverall,
    topItemsByDay,
    predictions
  };
}

const orders = generateOrders();
const analytics = analyzeData(orders);

const outputDir = path.join(__dirname, 'data');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(path.join(outputDir, 'orders.json'), JSON.stringify(orders.slice(0, 2000), null, 2)); // sample dataset
fs.writeFileSync(path.join(outputDir, 'analytics.json'), JSON.stringify(analytics, null, 2));

console.log(`Generated ${orders.length} orders successfully.`);
console.log(`Peak 15-minute slot: ${analytics.peakSlots[0][0]} (${analytics.peakSlots[0][1]} items)`);
console.log(`Top 1 Item: ${analytics.topItemsOverall[0].name} (${analytics.topItemsOverall[0].totalSold} sold)`);
