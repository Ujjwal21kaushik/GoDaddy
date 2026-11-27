import { OPEN, CLOSE, allSlots, orderUnits } from './helpers.js'

const DEAD = ['cancelled', 'rejected', 'expired']
const live = (s) => (s.orders || []).filter((o) => !DEAD.includes(o.status))
const liveToday = (s) => live(s).filter((o) => o.day === 0)

export function todayStats(s) {
  const orders = liveToday(s)
  const revenue = orders.reduce((a, o) => a + (o.total || 0), 0)
  const completed = orders.filter((o) => ['delivered', 'collected'].includes(o.status)).length
  const total = orders.length
  return { revenue, total, completed, pending: total - completed, aov: total ? revenue / total : 0 }
}

export function hourlySales(s) {
  const orders = liveToday(s)
  const rows = []
  const openH = Math.floor((s.hours?.open ?? OPEN) / 60)
  const closeH = Math.min(24, Math.ceil((s.hours?.close ?? CLOSE) / 60))
  for (let h = openH; h < closeH; h++) {
    let rev = 0, n = 0
    orders.forEach((o) => {
      if (Math.floor(o.slot / 60) % 24 === h) { n += 1; rev += o.total || 0 }
    })
    rows.push({ hour: h, revenue: Math.round(rev), orders: n })
  }
  return rows
}

export function weeklySales(s) {
  const orders = live(s)
  const base = new Date()
  const arr = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(base)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const start = d.getTime()
    const end = start + 86400000
    const dayOrders = orders.filter((o) => o.createdAt >= start && o.createdAt < end)
    const revenue = dayOrders.reduce((a, o) => a + (o.total || 0), 0)
    arr.push({
      day: i === 0 ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short' }),
      revenue: Math.round(revenue),
      orders: dayOrders.length,
    })
  }
  return arr
}

export function soldUnits(s, item, range = 'today') {
  const cutoff = range === 'today' ? Date.now() - 86400000 : 0
  return live(s)
    .filter((o) => !cutoff || o.day === 0 || (o.createdAt || 0) >= cutoff)
    .reduce((a, o) => a + ((o.items || []).find((i) => i.id === item.id)?.qty || 0), 0)
}

export function topItems(s, range, n = 5) {
  return (s.menu || [])
    .map((it) => {
      const units = soldUnits(s, it, range)
      return { id: it.id, name: it.name, emoji: it.emoji, units, revenue: units * it.price }
    })
    .filter((x) => x.units > 0)
    .sort((a, b) => b.units - a.units)
    .slice(0, n)
}

export function peakSlots(s, n = 5) {
  const counts = {}
  allSlots(s.hours?.open ?? OPEN, s.hours?.close ?? CLOSE).forEach((sl) => { counts[sl] = 0 })
  liveToday(s).forEach((o) => { counts[o.slot] = (counts[o.slot] || 0) + 1 })
  return Object.entries(counts)
    .map(([slot, orders]) => ({ slot: +slot, orders }))
    .filter((x) => x.orders > 0)
    .sort((a, b) => b.orders - a.orders || a.slot - b.slot)
    .slice(0, n)
}

export function inventorySummary(s) {
  const out = (s.menu || []).filter((i) => i.stock === 0)
  const low = (s.menu || []).filter((i) => i.stock > 0 && i.stock <= i.low)
  return { out, low }
}

export function demandStats(s, range) {
  const cutoff = range === 'today' ? Date.now() - 86400000 : 0
  const recs = (s.missed || []).filter((m) => !cutoff || m.day === 0 || (m.ts || 0) >= cutoff)
  const units = recs.reduce((a, m) => a + m.qty, 0)
  const recoveredUnits = recs.filter((m) => m.altId).reduce((a, m) => a + m.qty, 0)
  const lost = recs.filter((m) => !m.altId).reduce((a, m) => a + m.qty * m.price, 0)
  const recovered = recs.filter((m) => m.altId).reduce((a, m) => a + m.qty * m.altPrice, 0)
  const potential = recs.reduce((a, m) => a + m.qty * m.price, 0)

  const byItem = {}
  recs.forEach((m) => {
    const x = (byItem[m.itemId] ||= { id: m.itemId, name: m.name, price: m.price, requested: 0, lostUnits: 0, lostValue: 0, recoveredUnits: 0 })
    x.requested += m.qty
    if (m.altId) x.recoveredUnits += m.qty
    else { x.lostUnits += m.qty; x.lostValue += m.qty * m.price }
  })
  const top = Object.values(byItem).sort((a, b) => b.requested - a.requested)
  const topBy = top.slice(0, 5).map((x) => ({ ...x, now: (s.menu || []).find((i) => i.id === x.id) }))

  const vsSales = topItems(s, range, 6).map((x) => {
    const m = byItem[x.id]
    return { name: x.name.replace(/ \(.*\)/, '').split(' ')[0], sold: x.units, missed: m ? m.requested : 0 }
  })

  const hours = []
  const openH = Math.floor((s.hours?.open ?? OPEN) / 60)
  const closeH = Math.min(24, Math.ceil((s.hours?.close ?? CLOSE) / 60))
  for (let h = openH; h < closeH; h++) {
    hours.push({ hour: h, missed: recs.filter((m) => m.hour === h).reduce((a, m) => a + m.qty, 0) })
  }
  const windows = hours.slice(0, -1).map((h, i) => ({ from: h.hour, to: h.hour + 2, missed: h.missed + hours[i + 1].missed }))
    .sort((a, b) => b.missed - a.missed)
  const peak = []
  windows.forEach((w) => { if (peak.length < 3 && w.missed > 0 && !peak.some((p) => Math.abs(p.from - w.from) < 2)) peak.push(w) })

  return { recs, units, recoveredUnits, lost, recovered, potential, topBy, vsSales, hours, peak, recoveryRate: units ? Math.round((recoveredUnits / units) * 100) : 0 }
}

export function recommendations(s) {
  const all = s.missed || []
  return (s.menu || [])
    .map((it) => {
      const sold = soldUnits(s, it, 'week')
      const missed = all.filter((m) => m.itemId === it.id).reduce((a, m) => a + m.qty, 0)
      const rec = Math.ceil((sold + missed) * 1.1)
      return { item: it, sold, missed, rec, stock: it.stock }
    })
    .filter((r) => r.sold > 0 || r.missed > 0)
    .sort((a, b) => (b.missed + b.sold) - (a.missed + a.sold))
}

export const kitchenLoad = (s) => {
  const act = live(s).filter((o) => ['confirmed', 'preparing', 'almost'].includes(o.status))
  const units = act.reduce((a, o) => a + orderUnits(o), 0)
  const pct = Math.min(100, Math.round((act.length / 24) * 100))
  return { orders: act.length, units, pct, level: pct >= 75 ? 'Heavy' : pct >= 45 ? 'Moderate' : 'Light', waitMin: Math.ceil(units * 0.6) }
}
