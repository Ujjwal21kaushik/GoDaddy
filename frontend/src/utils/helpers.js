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
export const allSlots = (open = OPEN, close = CLOSE) => { const a = []; for (let m = open; m < close; m += 15) a.push(m); return a }
export const isEffAvail = (it) => !!it && it.available && it.stock > 0

export const STATUS_FLOW = ['preparing', 'ready', 'delivered']
export const STATUS_LABEL = {
  confirmed: 'Preparing', preparing: 'Preparing', almost: 'Preparing', ready: 'Ready', delivered: 'Delivered', collected: 'Delivered', cancelled: 'Cancelled',
  pending_approval: 'Awaiting Approval', counter_offer: 'Action Needed', rejected: 'Declined', expired: 'Expired', cancel_requested: 'Cancel Requested'
}
export const isDelivered = (o) => ['delivered', 'collected'].includes(o.status)

// Large orders need owner approval (keep in sync with backend/server.js)
export const APPROVAL = { qty: 20, total: 500, waitMin: 15, expireMin: 30, phone: '124567895' }
export const PREORDER_MIN = 60 // pickup more than this many minutes away = pre-order
export const isPreOrder = (slot, now) => slot - now > PREORDER_MIN
// Parallel batch cooking time: max across items of ceil(qty / batchSize) * prep
export const cookMinutes = (items, menu) => (items || []).reduce((max, i) => {
  const m = (menu || []).find((x) => x.id === i.id)
  const prep = m?.prep || 3
  const batch = Math.max(1, m?.batchSize || 4)
  return Math.max(max, Math.ceil(i.qty / batch) * prep)
}, 0)
export const earliestSlot = (now, cook) => Math.ceil((now + cook) / 15) * 15
export const exceedsStock = (items, menu) => (items || []).some((i) => {
  const m = (menu || []).find((x) => x.id === i.id)
  return m && i.qty > m.stock
})
// Pre-order / Owner approval ONLY when quantity exceeds shelf stock OR pickup slot > 1 hour away
export const needsApproval = (items, slot, now, menu) =>
  exceedsStock(items, menu) || (slot != null && isPreOrder(slot, now))
export const PENDING_STATUSES = ['pending_approval', 'counter_offer', 'cancel_requested']
export const isPendingApproval = (o) => PENDING_STATUSES.includes(o.status)

export function getCancelEligibility(order, now, menu) {
  if (!order) return { allowed: false, reason: 'Order not found' }
  if (['pending_approval', 'counter_offer'].includes(order.status)) {
    return { allowed: true, instant: true }
  }
  if (['preparing', 'confirmed'].includes(order.status)) {
    const cook = order.cookMinutes || cookMinutes(order.items, menu)
    const cutoffMin = order.isPreOrder ? Math.max(PREORDER_MIN, cook) : cook
    const cutoffSlot = order.slot - cutoffMin
    const timeLeft = order.slot - now
    if (timeLeft >= cutoffMin) {
      return { allowed: true, instant: false, cook, cutoffMin, cutoffSlot, timeLeft }
    }
    return {
      allowed: false, cook, cutoffMin, cutoffSlot, timeLeft,
      reason: `Cooking needs ~${cook} min (cutoff was ${fmtTime(cutoffSlot)})`
    }
  }
  return { allowed: false, reason: 'Order is already ready or delivered' }
}
const DEAD = ['cancelled', 'rejected', 'expired']
export const isDead = (o) => DEAD.includes(o.status)
export const SLOT_LABEL = { available: 'Available', busy: 'Busy', full: 'Full' }

const ACTIVE = ['confirmed', 'preparing', 'almost']
export const isActive = (o) => ACTIVE.includes(o.status)

export function slotStats(slot, orders, caps, slotCounts = null) {
  const cap = caps.overrides[slot] ?? caps.def
  const used = slotCounts && typeof slotCounts === 'object'
    ? Number(slotCounts[slot] || 0)
    : orders.filter((o) => o.day === 0 && o.slot === slot && !DEAD.includes(o.status)).length
  const raw = cap === 0 ? 100 : Math.round((used / cap) * 100)
  const state = cap === 0 || used >= cap ? 'full' : raw >= 60 ? 'busy' : 'available'
  return { slot, cap, used, pct: Math.min(raw, 100), state, left: Math.max(cap - used, 0) }
}

export function cartSummary(cart, menu, combos = [], preOrder = false) {
  const lines = Object.entries(cart)
    .map(([id, qty]) => ({ item: menu.find((x) => x.id === id), qty }))
    .filter((l) => l.item && l.qty > 0)
  const subtotal = lines.reduce((s, l) => s + l.item.price * l.qty, 0)
  const units = lines.reduce((s, l) => s + l.qty, 0)

  const comboList = Array.isArray(combos) ? combos : (combos ? [combos] : [])
  const activeCombos = comboList
    .filter((c) => c && c.active !== false && Array.isArray(c.items) && c.items.length > 0)
    .map((c) => {
      const original = c.items.reduce((s, ci) => s + (menu.find((x) => x.id === ci.id)?.price || 0) * (ci.qty || 1), 0)
      const savings = Math.max(original - (Number(c.price) || 0), 0)
      return { ...c, original, savings }
    })
    .filter((c) => c.savings > 0)
    .sort((a, b) => b.savings - a.savings)

  const rem = { ...cart }
  let discount = 0
  let comboSets = 0
  let comboOriginal = 0

  for (const c of activeCombos) {
    const sets = Math.min(...c.items.map((ci) => Math.floor((rem[ci.id] || 0) / (ci.qty || 1))))
    if (sets > 0) {
      discount += sets * c.savings
      comboSets += sets
      comboOriginal += sets * c.original
      c.items.forEach((ci) => {
        rem[ci.id] = (rem[ci.id] || 0) - sets * (ci.qty || 1)
      })
    }
  }

  const prep = lines.reduce((mx, l) => Math.max(mx, l.item.prep), 0)
  // Orders exceeding shelf stock are allowed and sent for manager approval
  const hasUnavailable = lines.some((l) => !isEffAvail(l.item))
  return { lines, subtotal, discount, total: Math.max(0, subtotal - discount), units, prep, hasUnavailable, comboSets, comboOriginal }
}

// minutes the kitchen needs before a new order could be ready
export function leadTime(prep, ordersOrUnits) {
  const units = typeof ordersOrUnits === 'number'
    ? ordersOrUnits
    : (ordersOrUnits || []).filter((o) => o.day === 0 && isActive(o)).reduce((s, o) => s + o.items.reduce((a, i) => a + i.qty, 0), 0)
  return prep + Math.ceil(units / 10)
}

export const orderUnits = (o) => o.items.reduce((s, i) => s + i.qty, 0)

export function genOrderId(existing) {
  const ids = new Set(existing.map((o) => o.id))
  let id
  do { id = 'YR-' + Math.random().toString(36).slice(2, 6).toUpperCase() } while (ids.has(id))
  return id
}
