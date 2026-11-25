import { OPEN, nextBoundary } from '../utils/helpers.js'

const U = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=500&q=70`

export const CATEGORIES = [
  { id: 'all', label: 'All', emoji: '🍴' },
  { id: 'Meals', label: 'Meals', emoji: '🍛' },
  { id: 'South Indian', label: 'South Indian', emoji: '🥞' },
  { id: 'Snacks', label: 'Snacks', emoji: '🥟' },
  { id: 'Burgers & Rolls', label: 'Burgers & Rolls', emoji: '🍔' },
  { id: 'Beverages', label: 'Beverages', emoji: '☕' },
  { id: 'Desserts', label: 'Desserts', emoji: '🍰' },
]

// stock = left today, daily = prepared today, low = low-stock threshold, weekUnits = units sold last 7 days
const m = (id, name, cat, price, emoji, img, desc, prep, stock, daily, low, weekUnits, popular = false, veg = true) => ({
  id, name, cat, price, emoji, img: img ? U(img) : '', desc, prep, stock, daily, low, weekUnits, popular, veg, available: true,
})

export const MENU = [
  m('m1', 'Veg Thali', 'Meals', 90, '🍛', '1585937421612-70a008356fbe', '2 rotis, dal, sabzi, rice, salad', 6, 40, 60, 8, 410, true),
  m('m2', 'Chole Bhature', 'Meals', 70, '🫓', '1626132647523-66f5bf380027', 'Fluffy bhature with spicy chole', 5, 0, 50, 8, 380, true),
  m('m3', 'Paneer Butter Masala + Rice', 'Meals', 110, '🧀', '1631452180519-c014fe946bc7', 'Creamy paneer gravy with jeera rice', 7, 25, 40, 6, 260),
  m('m4', 'Veg Biryani', 'Meals', 95, '🍚', '1563379091339-03b21ab4a4f8', 'Aromatic basmati with raita', 6, 30, 45, 6, 300),
  m('m5', 'Rajma Chawal', 'Meals', 75, '🫘', '1596797038530-2c107229654b', 'Comfort rajma with steamed rice', 5, 6, 35, 8, 220),
  m('s1', 'Masala Dosa', 'South Indian', 60, '🥞', '1668236543090-82eba5ee5976', 'Crispy dosa, potato masala, chutneys', 6, 35, 50, 8, 350, true),
  m('s2', 'Idli Sambar (3 pc)', 'South Indian', 40, '🍘', '1589301760014-d929f3979dbc', 'Soft idlis with hot sambar', 4, 45, 60, 8, 240),
  m('s3', 'Medu Vada (2 pc)', 'South Indian', 35, '🍩', '', 'Crisp outside, fluffy inside', 4, 4, 30, 6, 160),
  m('k1', 'Samosa (2 pc)', 'Snacks', 25, '🥟', '1601050690597-df0568f70950', 'Golden samosas with mint chutney', 2, 80, 120, 15, 560, true),
  m('k2', 'Veg Momos (6 pc)', 'Snacks', 60, '🥟', '1626776876729-bab4369a5a5c', 'Steamed momos, spicy red chutney', 6, 28, 50, 6, 330, true),
  m('k3', 'French Fries', 'Snacks', 55, '🍟', '1573080496219-bb080dd4f877', 'Salted crispy fries', 4, 40, 60, 8, 270),
  m('k4', 'Veg Maggi', 'Snacks', 45, '🍜', '1612929633738-8fe44f7ec841', 'Masala maggi with veggies', 4, 0, 60, 8, 420, true),
  m('k5', 'Pav Bhaji', 'Snacks', 70, '🍞', '1606491956689-2ea866880c84', 'Buttery bhaji with toasted pav', 6, 20, 30, 5, 210),
  m('b1', 'Veg Burger', 'Burgers & Rolls', 50, '🍔', '1568901346375-23c9450c58cd', 'Crunchy patty, cheese, house sauce', 5, 35, 50, 6, 310),
  m('b2', 'Paneer Roll', 'Burgers & Rolls', 65, '🌯', '1633321702518-7feccafb94d5', 'Tandoori paneer in a soft roll', 5, 0, 40, 6, 290),
  m('b3', 'Cheese Sandwich', 'Burgers & Rolls', 45, '🥪', '1528735602780-2552fd46c7af', 'Grilled with melted cheese', 4, 22, 40, 6, 230),
  m('b4', 'Grilled Veggie Wrap', 'Burgers & Rolls', 70, '🌯', '1626700051175-6818013e1d4f', 'Grilled veg, hummus, greens', 5, 18, 30, 5, 150),
  m('d1', 'Masala Chai', 'Beverages', 15, '☕', '1576092768241-dec231879fc3', 'Kadak ginger-cardamom chai', 2, 120, 200, 20, 700, true),
  m('d2', 'Cold Coffee', 'Beverages', 50, '🧋', '1517701550927-30cf4ba1dba5', 'Thick, chilled, creamy', 3, 0, 80, 10, 480, true),
  m('d3', 'Fresh Lime Soda', 'Beverages', 30, '🍋', '1556679343-c7306c1976bc', 'Sweet, salted or mixed', 2, 40, 60, 8, 190),
  m('d4', 'Mango Shake', 'Beverages', 55, '🥭', '1553530666-ba11a7da3888', 'Alphonso mango, thick shake', 3, 5, 40, 8, 260),
  m('e1', 'Gulab Jamun (2 pc)', 'Desserts', 30, '🍯', '1666190092159-3171cf0fbb12', 'Warm, syrupy, soft', 2, 30, 50, 8, 200),
  m('e2', 'Chocolate Brownie', 'Desserts', 45, '🍫', '1606313564200-e75d5e30476c', 'Fudgy walnut brownie', 2, 2, 30, 5, 240),
  m('e3', 'Fruit Bowl', 'Desserts', 50, '🍉', '1546069901-ba9599a7e63c', 'Seasonal fresh fruits', 3, 15, 25, 5, 90),
]

export const COMBO = {
  id: 'combo-1',
  name: 'Thali Combo of the Day',
  tagline: 'Veg Thali + Masala Chai + Gulab Jamun',
  items: [{ id: 'm1', qty: 1 }, { id: 'd1', qty: 1 }, { id: 'e1', qty: 1 }],
  price: 109,
}

export const DEFAULT_CAPACITY = 6

function rng(seed) {
  let a = seed
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)]
const NAMES = ['Aarav', 'Diya', 'Rohan', 'Isha', 'Kabir', 'Meera', 'Vivaan', 'Anaya', 'Arjun', 'Sara', 'Yash', 'Tara']

const AOV = 168
const HOUR_SHAPE = { 8: 0.5, 9: 0.7, 10: 0.45, 11: 0.8, 12: 1, 13: 1, 14: 0.7, 15: 0.4, 16: 0.65, 17: 0.5, 18: 0.3, 19: 0.2, 20: 0.15 }

// Yesterday-style history & seeded rush for the kitchen. Everything is relative to `nowMin` so the demo always looks alive.
export function buildSeedState(nowMin) {
  const r = rng(42)
  const menu = MENU.map((x) => ({ ...x }))
  const sellable = menu.filter((x) => x.stock > 0)

  const mkOrder = (i, slot, status, extra = {}) => {
    const n = 1 + Math.floor(r() * 3)
    const items = []
    for (let k = 0; k < n; k++) {
      const it = pick(r, sellable)
      if (items.find((x) => x.id === it.id)) continue
      items.push({ id: it.id, name: it.name, price: it.price, qty: 1 + (r() < 0.25 ? 1 : 0) })
    }
    const total = items.reduce((s, x) => s + x.price * x.qty, 0)
    const at = Date.now() - (5 + Math.floor(r() * 40)) * 60000
    return {
      id: `YR-${(4000 + i * 37) % 9000 + 1000}`,
      name: pick(r, NAMES), items, total, discount: 0, slot, createdAt: at, status,
      history: [{ status: 'confirmed', at }], payment: 'UPI', day: 0, mine: false, ...extra,
    }
  }

  const s0 = nextBoundary(nowMin)
  const plan = [
    [-15, 'ready', 2], [-15, 'collected', 1],
    [0, 'almost', 2], [0, 'preparing', 2], [0, 'confirmed', 2],
    [15, 'preparing', 1], [15, 'confirmed', 3],
    [30, 'confirmed', 3], [45, 'confirmed', 2], [60, 'confirmed', 1], [75, 'confirmed', 2],
  ]
  const orders = []
  let i = 0
  plan.forEach(([off, status, count]) => {
    for (let c = 0; c < count; c++) orders.push(mkOrder(i++, s0 + off, status))
  })
  orders.forEach((o) => { if (o.status !== 'confirmed') o.history.push({ status: o.status, at: o.createdAt + 60000 }) })

  // two past orders so "My Orders" is never empty
  const past = [
    { id: 'YR-3182', items: [{ id: 'm1', name: 'Veg Thali', price: 90, qty: 1 }, { id: 'd1', name: 'Masala Chai', price: 15, qty: 1 }] },
    { id: 'YR-2907', items: [{ id: 'k1', name: 'Samosa (2 pc)', price: 25, qty: 2 }, { id: 'd3', name: 'Fresh Lime Soda', price: 30, qty: 1 }] },
  ].map((p, k) => ({
    ...p, name: 'Student', total: p.items.reduce((s, x) => s + x.price * x.qty, 0), discount: 0, slot: 13 * 60 + 15 * k,
    createdAt: Date.now() - 86400000 * (k + 1), status: 'collected', history: [], payment: 'UPI', day: -1, mine: true,
  }))

  // baseline: orders already completed earlier today
  const slotOrders = {}
  for (let sl = OPEN; sl < s0 - 15; sl += 15) {
    const h = Math.floor(sl / 60)
    slotOrders[sl] = Math.min(DEFAULT_CAPACITY, Math.round((HOUR_SHAPE[h] ?? 0.2) * (4 + r() * 2.5)))
  }
  const weekly = [18450, 16980, 19820, 21040, 17560, 14230].map((rev, k) => ({ revenue: rev, orders: Math.round(rev / AOV) }))

  // seeded missed demand over 7 days
  const mix = [['d2', 30], ['m2', 26], ['k4', 22], ['b2', 16], ['d4', 10], ['e2', 8]]
  const hourW = [[8, 6], [9, 8], [10, 5], [11, 7], [12, 16], [13, 18], [14, 12], [15, 6], [16, 9], [17, 8], [18, 3]]
  const wsum = (arr) => arr.reduce((s, x) => s + x[1], 0)
  const weigh = (arr) => { let t = r() * wsum(arr); for (const x of arr) { t -= x[1]; if (t <= 0) return x[0] } return arr[0][0] }
  const missed = []
  const curHour = Math.floor(nowMin / 60)
  for (let n = 0; n < 150; n++) {
    const day = Math.floor(r() * 7)
    let hour = weigh(hourW)
    if (day === 0 && hour > curHour) hour = Math.max(8, Math.min(hour, curHour))
    const itemId = weigh(mix)
    const item = menu.find((x) => x.id === itemId)
    const recovered = r() < 0.28
    const alt = recovered ? pick(r, menu.filter((x) => x.cat === item.cat && x.stock > 0 && x.id !== item.id)) : null
    missed.push({
      id: `ms${n}`, itemId: item.id, name: item.name, cat: item.cat, price: item.price, qty: 1 + Math.floor(r() * 3),
      day, hour, bucket: pick(r, [0, 15, 30, 45]), altId: alt?.id ?? null, altName: alt?.name ?? null, altPrice: alt?.price ?? 0,
      ts: Date.now() - day * 86400000, seeded: true,
    })
  }

  return {
    menu, orders: [...orders, ...past], cart: {}, missed, stockouts: [], tomorrowPlan: {},
    caps: { def: DEFAULT_CAPACITY, overrides: {} },
    baseline: { slotOrders, aov: AOV, weekly },
    profile: { name: '' },
  }
}
