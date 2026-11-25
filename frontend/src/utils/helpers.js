export const OPEN = 8 * 60
export const CLOSE = 21 * 60

export const fmtTime = (m) => {
  const h = Math.floor(m / 60) % 24
  const mm = m % 60
  return `${h % 12 || 12}:${String(mm).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}
export const fmtHour = (h) => `${h % 12 || 12}${h >= 12 ? 'PM' : 'AM'}`
export const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN')
export const nextBoundary = (m) => Math.ceil((m + 1) / 15) * 15
export const allSlots = () => { const a = []; for (let m = OPEN; m < CLOSE; m += 15) a.push(m); return a }
export const isEffAvail = (it) => !!it && it.available && it.stock > 0

export const STATUS_FLOW = ['confirmed', 'preparing', 'almost', 'ready']
export const STATUS_LABEL = { confirmed: 'Confirmed', preparing: 'Preparing', almost: 'Almost Ready', ready: 'Ready', collected: 'Collected', cancelled: 'Cancelled' }
export const SLOT_LABEL = { available: 'Available', busy: 'Busy', full: 'Full' }

const ACTIVE = ['confirmed', 'preparing', 'almost']
export const isActive = (o) => ACTIVE.includes(o.status)

export function slotStats(slot, orders, caps) {
  const cap = caps.overrides[slot] ?? caps.def
  const used = orders.filter((o) => o.day === 0 && o.slot === slot && o.status !== 'cancelled').length
  const raw = cap === 0 ? 100 : Math.round((used / cap) * 100)
  const state = cap === 0 || used >= cap ? 'full' : raw >= 60 ? 'busy' : 'available'
  return { slot, cap, used, pct: Math.min(raw, 100), state, left: Math.max(cap - used, 0) }
}

export function cartSummary(cart, menu, combo) {
  const lines = Object.entries(cart)
    .map(([id, qty]) => ({ item: menu.find((x) => x.id === id), qty }))
    .filter((l) => l.item && l.qty > 0)
  const subtotal = lines.reduce((s, l) => s + l.item.price * l.qty, 0)
  const units = lines.reduce((s, l) => s + l.qty, 0)
  const sets = Math.min(...combo.items.map((c) => Math.floor((cart[c.id] || 0) / c.qty)))
  const original = combo.items.reduce((s, c) => s + (menu.find((x) => x.id === c.id)?.price || 0) * c.qty, 0)
  const discount = sets > 0 ? sets * Math.max(original - combo.price, 0) : 0
  const prep = lines.reduce((mx, l) => Math.max(mx, l.item.prep), 0)
  const hasUnavailable = lines.some((l) => !isEffAvail(l.item) || l.qty > l.item.stock)
  return { lines, subtotal, discount, total: subtotal - discount, units, prep, hasUnavailable, comboSets: sets > 0 ? sets : 0, comboOriginal: original }
}

// minutes the kitchen needs before a new order could be ready
export function leadTime(prep, orders) {
  const units = orders.filter((o) => o.day === 0 && isActive(o)).reduce((s, o) => s + o.items.reduce((a, i) => a + i.qty, 0), 0)
  return prep + Math.ceil(units / 10)
}

export const orderUnits = (o) => o.items.reduce((s, i) => s + i.qty, 0)

export function genOrderId(existing) {
  const ids = new Set(existing.map((o) => o.id))
  let id
  do { id = 'YR-' + Math.random().toString(36).slice(2, 6).toUpperCase() } while (ids.has(id))
  return id
}
