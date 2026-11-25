// database.js - Single Counter, Dynamic 10:00 AM to 5:00 PM 15-Minute Slots
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, 'db.json');

// Helper to generate all 15-minute slots from 10:00 AM to 5:00 PM
function generateDaySlots() {
  const slots = [];
  let startMinutes = 10 * 60; // 10:00 AM (600 mins)
  const endMinutes = 17 * 60;  // 5:00 PM (1020 mins)
  let index = 1;

  while (startMinutes < endMinutes) {
    const nextMinutes = startMinutes + 15;
    
    const formatTime = (mins) => {
      const h24 = Math.floor(mins / 60);
      const m = mins % 60;
      const period = h24 >= 12 ? 'PM' : 'AM';
      const h12 = h24 > 12 ? h24 - 12 : (h24 === 0 ? 12 : h24);
      const mStr = m === 0 ? '00' : (m < 10 ? `0${m}` : m);
      return `${h12}:${mStr} ${period}`;
    };

    const label = `${formatTime(startMinutes)} - ${formatTime(nextMinutes)}`;
    const isLunchPeak = (startMinutes >= 13 * 60 && startMinutes < 14 * 60); // 1:00 PM - 2:00 PM peak rush

    // Pre-populate realistic bookings for demo
    let initialBooked = 0;
    if (label === '1:00 PM - 1:15 PM') initialBooked = 19; // 1 away from 20 cap for instant gate test
    else if (label === '1:15 PM - 1:30 PM') initialBooked = 14;
    else if (label === '12:45 PM - 1:00 PM') initialBooked = 16;
    else initialBooked = Math.floor(Math.random() * 4);

    slots.push({
      id: `slot-${index++}`,
      label,
      startMinutes,
      endMinutes: nextMinutes,
      capacity: 20, // Single counter limit: 20 orders per 15-minute slot
      booked: initialBooked,
      isLunchPeak
    });

    startMinutes = nextMinutes;
  }
  return slots;
}

const INITIAL_DATA = {
  // Single Canteen Pickup Counter
  counter: {
    id: 'counter-main',
    name: 'Main Canteen Counter',
    slotLimit: 20
  },
  menu: [
    { id: 'm1', name: 'Samosa (2 pcs)', category: 'Snack', price: 25, stock: 10, totalInitial: 50, prepTimeMins: 6, image: '🥟', isPopular: true },
    { id: 'm2', name: 'Kachori with Chutney', category: 'Snack', price: 25, stock: 20, totalInitial: 40, prepTimeMins: 5, image: '🥠', isPopular: false },
    { id: 'm3', name: 'Aloo Patty', category: 'Snack', price: 20, stock: 15, totalInitial: 35, prepTimeMins: 4, image: '🥪', isPopular: true },
    { id: 'm4', name: 'Veg Grilled Sandwich', category: 'Meal', price: 50, stock: 12, totalInitial: 30, prepTimeMins: 8, image: '🥪', isPopular: false },
    { id: 'm5', name: 'Special Masala Maggi', category: 'Meal', price: 40, stock: 25, totalInitial: 45, prepTimeMins: 7, image: '🍜', isPopular: true },
    { id: 'm6', name: 'Chole Kulche Combo', category: 'Meal', price: 65, stock: 8, totalInitial: 25, prepTimeMins: 10, image: '🍲', isPopular: true },
    { id: 'm7', name: 'Cold Coffee with Ice Cream', category: 'Beverage', price: 45, stock: 30, totalInitial: 40, prepTimeMins: 3, image: '🥤', isPopular: true },
    { id: 'm8', name: 'Masala Chai', category: 'Beverage', price: 15, stock: 45, totalInitial: 60, prepTimeMins: 2, image: '☕', isPopular: true }
  ],
  slots: generateDaySlots(),
  orders: [
    {
      orderId: 'ORD-101',
      token: 'T-101',
      studentName: 'Aarav Sharma',
      items: [{ id: 'm1', name: 'Samosa (2 pcs)', quantity: 2, price: 25 }],
      totalAmount: 50,
      slotId: 'slot-13',
      slotLabel: '1:00 PM - 1:15 PM',
      status: 'Preparing', // Placed -> Preparing -> Ready -> Completed
      estimatedMins: 7,
      createdAt: '12:56 PM'
    },
    {
      orderId: 'ORD-102',
      token: 'T-102',
      studentName: 'Rohan Verma',
      items: [{ id: 'm8', name: 'Masala Chai', quantity: 1, price: 15 }],
      totalAmount: 15,
      slotId: 'slot-13',
      slotLabel: '1:00 PM - 1:15 PM',
      status: 'Ready',
      estimatedMins: 2,
      createdAt: '12:58 PM'
    }
  ],
  unmetDemand: {
    'm1': 35,
    'm6': 12
  },
  // Allows setting mock time for hackathon demos (e.g., '13:05' or null for real system time)
  simulatedTime: '12:50'
};

class LocalDB {
  constructor() {
    this.init();
  }

  init() {
    if (!fs.existsSync(DB_FILE)) {
      this.save(INITIAL_DATA);
    }
  }

  read() {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(content);
    } catch (e) {
      console.error('Error reading DB, resetting to initial', e);
      return INITIAL_DATA;
    }
  }

  save(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  }

  reset() {
    const fresh = { ...INITIAL_DATA, slots: generateDaySlots() };
    this.save(fresh);
    return fresh;
  }
}

module.exports = new LocalDB();
