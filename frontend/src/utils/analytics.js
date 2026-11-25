import { OPEN, CLOSE, allSlots, orderUnits } from './helpers.js'

const live = (s) => s.orders.filter((o) => o.day === 0 && o.status !== 'cancelled')

export function todayStats(s) {
  const orders = live(s)
  const b = s.baseline
  const baseOrders = Object.values(b.slotOrders).reduce((a, x) => a + x, 0)
  const revenue = baseOrders * b.aov + orders.reduce((a, o) => a + o.total, 0)
  const completed = baseOrders + orders.filter((o) => o.status === 'collected').length
  const total = baseOrders + orders.length
  return { revenue, total, completed, pending: total - completed, aov: total ? revenue / total : 0 }
}

export function hourlySales(s) {
  const b = s.baseline
  const rows = []
  for (let h = OPEN / 60; h < CLOSE / 60; h++) {
    let rev = 0, n = 0
    Object.entries(b.slotOrders).forEach(([sl, c]) => { if (Math.floor(sl / 60) === h) { n += c; rev += c * b.aov } })
    live(s).forEach((o) => { if (Math.floor(o.slot / 60) === h) { n += 1; rev += o.total } })
    rows.push({ hour: h, revenue: Math.round(rev), orders: n })
  }
  return rows
}

export function weeklySales(s) {
  const t = todayStats(s)
  const base = new Date()
  const arr = s.baseline.weekly.map((w, i) => {
    const d = new Date(base)
    d.setDate(base.getDate() - (s.baseline.weekly.length - i))
    return { day: d.toLocaleDateString('en-IN', { weekday: 'short' }), revenue: w.revenue, orders: w.orders }
  })
  arr.push({ day: 'Today', revenue: Math.round(t.revenue), orders: t.total })
  return arr
}

export function soldUnits(s, item, range) {
  const base = range === 'today' ? Math.round((item.weekUnits / 7) * 0.8) : item.weekUnits
  const liveUnits = live(s).reduce((a, o) => a + (o.items.find((i) => i.id === item.id)?.qty || 0), 0)
  return base + liveUnits
}

export function topItems(s, range, n = 5) {
  return s.menu.map((it) => ({ id: it.id, name: it.name, emoji: it.emoji, units: soldUnits(s, it, range), revenue: soldUnits(s, it, range) * it.price }))
    .sort((a, b) => b.units - a.units).slice(0, n)
}

export function peakSlots(s, n = 5) {
  const counts = {}
  allSlots().forEach((sl) => { counts[sl] = (s.baseline.slotOrders[sl] || 0) })
  live(s).forEach((o) => { counts[o.slot] = (counts[o.slot] || 0) + 1 })
  return Object.entries(counts).map(([slot, orders]) => ({ slot: +slot, orders })).sort((a, b) => b.orders - a.orders || a.slot - b.slot).slice(0, n)
}

export function inventorySummary(s) {
  const out = s.menu.filter((i) => i.stock === 0)
  const low = s.menu.filter((i) => i.stock > 0 && i.stock <= i.low)
  return { out, low }
}

export function demandStats(s, range) {
  const recs = s.missed.filter((m) => (range === 'today' ? m.day === 0 : true))
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
  const topBy = top.slice(0, 5).map((x) => ({ ...x, now: s.menu.find((i) => i.id === x.id) }))

  const vsSales = top.slice(0, 6).map((x) => {
    const it = s.menu.find((i) => i.id === x.id)
    return { name: x.name.replace(/ \(.*\)/, '').split(' ')[0], sold: it ? soldUnits(s, it, range) : 0, missed: x.requested }
  })

  const hours = []
  for (let h = OPEN / 60; h < CLOSE / 60; h++) hours.push({ hour: h, missed: recs.filter((m) => m.hour === h).reduce((a, m) => a + m.qty, 0) })
  const windows = hours.slice(0, -1).map((h, i) => ({ from: h.hour, to: h.hour + 2, missed: h.missed + hours[i + 1].missed }))
    .sort((a, b) => b.missed - a.missed)
  const peak = []
  windows.forEach((w) => { if (peak.length < 3 && w.missed > 0 && !peak.some((p) => Math.abs(p.from - w.from) < 2)) peak.push(w) })

  return { recs, units, recoveredUnits, lost, recovered, potential, topBy, vsSales, hours, peak, recoveryRate: units ? Math.round((recoveredUnits / units) * 100) : 0 }
}

// tomorrow's prep recommendation: avg daily sales + avg daily missed demand (7d) + 10% buffer
export function recommendations(s) {
  const all = s.missed
  return s.menu.map((it) => {
    const missed7 = all.filter((m) => m.itemId === it.id).reduce((a, m) => a + m.qty, 0)
    const avgSold = it.weekUnits / 7
    const avgMissed = missed7 / 7
    const rec = Math.ceil((avgSold + avgMissed) * 1.1)
    const plan = s.tomorrowPlan[it.id] ?? it.daily
    return { item: it, avgSold: Math.round(avgSold), avgMissed: +avgMissed.toFixed(1), missed7, rec, plan, delta: rec - it.daily, applied: s.tomorrowPlan[it.id] === rec }
  }).filter((r) => r.missed7 > 0).sort((a, b) => b.missed7 - a.missed7)
}

export const kitchenLoad = (s) => {
  const act = live(s).filter((o) => ['confirmed', 'preparing', 'almost'].includes(o.status))
  const units = act.reduce((a, o) => a + orderUnits(o), 0)
  const pct = Math.min(100, Math.round((act.length / 24) * 100))
  return { orders: act.length, units, pct, level: pct >= 75 ? 'Heavy' : pct >= 45 ? 'Moderate' : 'Light', waitMin: Math.ceil(units * 0.6) }
}
