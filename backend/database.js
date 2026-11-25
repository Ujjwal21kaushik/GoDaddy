// database.js - Single Source of Truth with HD Photos and 20 Stock Baseline
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, 'db.json');

const U = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=600&q=80`;

// Rich HD Food Photos with all stock initialized to 20
const RICH_MENU_WITH_PHOTOS = [
  {
    id: 'k1',
    name: 'Samosa (2 pc)',
    cat: 'Snacks',
    price: 25,
    emoji: '🥟',
    img: U('1601050690597-df0568f70950'),
    desc: 'Golden crispy samosas served with tangy mint & tamarind chutney',
    prep: 3,
    stock: 20,
    daily: 80,
    low: 5,
    popular: true,
    veg: true,
    available: true,
    weekUnits: 560
  },
  {
    id: 'm1',
    name: 'Veg Deluxe Thali',
    cat: 'Meals',
    price: 90,
    emoji: '🍛',
    img: U('1585937421612-70a008356fbe'),
    desc: '2 butter rotis, dal makhani, paneer sabzi, jeera rice, salad & pickle',
    prep: 6,
    stock: 20,
    daily: 60,
    low: 5,
    popular: true,
    veg: true,
    available: true,
    weekUnits: 410
  },
  {
    id: 'm2',
    name: 'Chole Bhature (2 pc)',
    cat: 'Meals',
    price: 70,
    emoji: '🫓',
    img: U('1626132647523-66f5bf380027'),
    desc: 'Fluffy golden bhature served with rich spicy Punjabi chole & onion salad',
    prep: 5,
    stock: 20,
    daily: 50,
    low: 5,
    popular: true,
    veg: true,
    available: true,
    weekUnits: 380
  },
  {
    id: 's1',
    name: 'Crispy Masala Dosa',
    cat: 'South Indian',
    price: 60,
    emoji: '🥞',
    img: U('1668236543090-82eba5ee5976'),
    desc: 'Crispy butter dosa loaded with aloo masala, hot sambar & coconut chutney',
    prep: 6,
    stock: 20,
    daily: 50,
    low: 5,
    popular: true,
    veg: true,
    available: true,
    weekUnits: 350
  },
  {
    id: 's2',
    name: 'Idli Sambar (3 pc)',
    cat: 'South Indian',
    price: 40,
    emoji: '🍘',
    img: U('1589301760014-d929f3979dbc'),
    desc: 'Steamed soft rice idlis dipped in boiling piping hot lentil sambar',
    prep: 4,
    stock: 20,
    daily: 45,
    low: 5,
    popular: false,
    veg: true,
    available: true,
    weekUnits: 240
  },
  {
    id: 'k2',
    name: 'Steamed Veg Momos (6 pc)',
    cat: 'Snacks',
    price: 60,
    emoji: '🥟',
    img: U('1626776876729-bab4369a5a5c'),
    desc: 'Thin-layer juicy vegetable momos paired with fiery hot red garlic dip',
    prep: 6,
    stock: 20,
    daily: 50,
    low: 5,
    popular: true,
    veg: true,
    available: true,
    weekUnits: 330
  },
  {
    id: 'k4',
    name: 'Special Masala Maggi',
    cat: 'Snacks',
    price: 45,
    emoji: '🍜',
    img: U('1612929633738-8fe44f7ec841'),
    desc: 'Double masala noodles tossed with chopped onions, green peas & tomatoes',
    prep: 4,
    stock: 20,
    daily: 60,
    low: 5,
    popular: true,
    veg: true,
    available: true,
    weekUnits: 420
  },
  {
    id: 'b1',
    name: 'Veg Cheese Burger',
    cat: 'Burgers & Rolls',
    price: 50,
    emoji: '🍔',
    img: U('1568901346375-23c9450c58cd'),
    desc: 'Crispy herb potato patty, melted cheese slice, lettuce & burger sauce',
    prep: 5,
    stock: 20,
    daily: 50,
    low: 5,
    popular: true,
    veg: true,
    available: true,
    weekUnits: 310
  },
  {
    id: 'b2',
    name: 'Tandoori Paneer Roll',
    cat: 'Burgers & Rolls',
    price: 65,
    emoji: '🌯',
    img: U('1633321702518-7feccafb94d5'),
    desc: 'Smoky grilled paneer cubes wrapped in layered parotta with mint mayo',
    prep: 5,
    stock: 20,
    daily: 40,
    low: 5,
    popular: true,
    veg: true,
    available: true,
    weekUnits: 290
  },
  {
    id: 'b3',
    name: 'Grilled Cheese Sandwich',
    cat: 'Burgers & Rolls',
    price: 45,
    emoji: '🥪',
    img: U('1528735602780-2552fd46c7af'),
    desc: 'Golden toasted bread stuffed with molten cheese and spiced capsicum',
    prep: 4,
    stock: 20,
    daily: 40,
    low: 5,
    popular: false,
    veg: true,
    available: true,
    weekUnits: 230
  },
  {
    id: 'd1',
    name: 'Masala Chai',
    cat: 'Beverages',
    price: 15,
    emoji: '☕',
    img: U('1576092768241-dec231879fc3'),
    desc: 'Desi kadak chai brewed with ginger, crushed cardamom & lemongrass',
    prep: 2,
    stock: 20,
    daily: 150,
    low: 5,
    popular: true,
    veg: true,
    available: true,
    weekUnits: 700
  },
  {
    id: 'd2',
    name: 'Cold Coffee with Ice Cream',
    cat: 'Beverages',
    price: 50,
    emoji: '🧋',
    img: U('1517701550927-30cf4ba1dba5'),
    desc: 'Thick creamy blended cold coffee topped with vanilla ice cream scoop',
    prep: 3,
    stock: 20,
    daily: 80,
    low: 5,
    popular: true,
    veg: true,
    available: true,
    weekUnits: 480
  }
];

const INITIAL_DATA = {
  menu: RICH_MENU_WITH_PHOTOS,
  orders: [],
  missed: [],
  bulkAlerts: []
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
      return INITIAL_DATA;
    }
  }

  save(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  }

  reset() {
    this.save(INITIAL_DATA);
    return INITIAL_DATA;
  }
}

module.exports = new LocalDB();
