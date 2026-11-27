import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, ArrowRight, CheckCircle2, Hourglass, IndianRupee, ShieldAlert, ShoppingBag, TrendingUp, UserX } from 'lucide-react'
import { useApp } from '../../../store/AppContext.jsx'
import { demandStats, hourlySales, inventorySummary, peakSlots, todayStats, topItems, weeklySales } from '../../../utils/analytics.js'
import { fmtHour, fmtTime, inr } from '../../../utils/helpers.js'

const ACCENT = '#FF3B1D', INK = '#09090B'
const tip = {
  contentStyle: { borderRadius: 4, border: '1px solid #E2E2DC', fontSize: 12, fontFamily: 'JetBrains Mono' },
  cursor: { fill: 'rgba(9, 9, 11, 0.05)' }
}

export default function Overview() {
  const { state, orders, now, dispatch, toast } = useApp()
  const [view, setView] = useState('daily')
  const [range, setRange] = useState('today')
  const t = todayStats(state)
  const hourly = hourlySales(state).map((h) => ({ ...h, label: fmtHour(h.hour) }))
  const weekly = weeklySales(state)
  const top = topItems(state, range)
  const peaks = peakSlots(state)
  const inv = inventorySummary(state)
  const d = demandStats(state, 'week')
  const maxUnits = top[0]?.units || 1

  const uncollectedOrders = orders.filter((o) => {
    return !['delivered', 'collected', 'cancelled', 'rejected', 'expired', 'pending_approval', 'counter_offer', 'cancel_requested'].includes(o.status) && (now > o.slot + 30)
  })

  const cancelAndBlacklist = (order) => {
    dispatch({ type: 'STATUS', id: order.id, status: 'cancelled' })
    toast(`Order ${order.id} cancelled and flagged for pickup violation`, 'warn')
  }

  const kpis = [
    { icon: IndianRupee, label: 'Revenue today', value: inr(t.revenue), sub: `Avg order ${inr(t.aov)}` },
    { icon: ShoppingBag, label: 'Total orders', value: t.total, sub: 'incl. pre-booked slots' },
    { icon: CheckCircle2, label: 'Completed', value: t.completed, sub: `${t.total ? Math.round((t.completed / t.total) * 100) : 0}% done`, tone: 'green' },
    { icon: Hourglass, label: 'Pending', value: t.pending, sub: 'in queue or awaiting pickup', tone: 'amber' },
  ]

  return (
    <div className="stack">
      {uncollectedOrders.length > 0 && (
        <section className="card" style={{ borderColor: 'var(--red)', background: 'var(--red-soft)' }}>
          <div className="row between" style={{ marginBottom: 12 }}>
            <div className="row">
              <ShieldAlert size={20} color="#E11D48" />
              <div>
                <h3 style={{ color: '#9F1239', fontSize: 15 }}>
                  {uncollectedOrders.length} Overdue Uncollected Order{uncollectedOrders.length > 1 ? 's' : ''} (&gt;30 min past slot)
                </h3>
                <small style={{ color: '#9F1239' }}>Review student details or cancel &amp; restock.</small>
              </div>
            </div>
            <Link to="/owner/slots" className="link">Manage in Slot Manager <ArrowRight size={13} /></Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {uncollectedOrders.map((o) => (
              <div key={o.id} className="slot-row" style={{ borderColor: 'var(--red-border)' }}>
                <div>
                  <div className="row">
                    <b className="mono">{o.id}</b>
                    <span className="tag red">Overdue {now - o.slot}m</span>
                  </div>
                  <small>Student: <b>{o.name || 'Student'}</b> · Slot <b className="mono">{fmtTime(o.slot)}</b> · {(o.items || []).map((i) => `${i.qty}× ${i.name}`).join(', ')}</small>
                </div>
                <button className="btn-danger" onClick={() => cancelAndBlacklist(o)}>
                  <UserX size={14} /> Blacklist &amp; Restock
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="kpis">
        {kpis.map((k) => (
          <div key={k.label} className={`card kpi ${k.tone || ''}`}>
            <span className="kpi-ic"><k.icon size={16} /></span>
            <small>{k.label}</small><b>{k.value}</b><em>{k.sub}</em>
          </div>
        ))}
      </div>

      <Link to="/owner/demand" className="demand-teaser">
        <div>
          <TrendingUp size={18} color="#D4FF00" />
          <div>
            <b>Lost {inr(d.lost)} this week to sold-out items</b>
            <small>{d.units} requested while out · {d.recoveryRate}% recovered via alternatives</small>
          </div>
        </div>
        <span>Demand Intelligence <ArrowRight size={14} /></span>
      </Link>

      <div className="two">
        <section className="card">
          <div className="card-head">
            <h3>Sales</h3>
            <div className="seg">
              <button className={view === 'daily' ? 'on' : ''} onClick={() => setView('daily')}>Daily</button>
              <button className={view === 'weekly' ? 'on' : ''} onClick={() => setView('weekly')}>Weekly</button>
            </div>
          </div>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              {view === 'daily' ? (
                <BarChart data={hourly}>
                  <CartesianGrid vertical={false} stroke="#E2E2DC" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#71717A' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#71717A' }} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip {...tip} formatter={(v) => [inr(v), 'Revenue']} />
                  <Bar dataKey="revenue" fill={INK} radius={[2, 2, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={weekly}>
                  <CartesianGrid vertical={false} stroke="#E2E2DC" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#71717A' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#71717A' }} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                  <Tooltip {...tip} formatter={(v, n) => [n === 'revenue' ? inr(v) : v, n === 'revenue' ? 'Revenue' : 'Orders']} />
                  <Line type="monotone" dataKey="revenue" stroke={ACCENT} strokeWidth={2.5} dot={{ r: 4, fill: ACCENT }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h3>Top 5 Selling Items</h3>
            <div className="seg">
              <button className={range === 'today' ? 'on' : ''} onClick={() => setRange('today')}>Today</button>
              <button className={range === 'week' ? 'on' : ''} onClick={() => setRange('week')}>Week</button>
            </div>
          </div>
          <div className="rank">
            {top.length === 0 ? (
              <div className="empty" style={{ padding: '24px 16px' }}>
                <span className="empty-code">NO SALES YET</span>
                <p>Top selling items appear here as live orders arrive.</p>
              </div>
            ) : top.map((i, n) => (
              <div key={i.id} className="rank-row">
                <span className="rank-n">{n + 1}</span>
                <span className="rank-e">{i.emoji}</span>
                <div className="grow">
                  <div className="rank-top"><b>{i.name}</b><span className="mono">{i.units} sold</span></div>
                  <div className="bar"><i style={{ width: `${(i.units / maxUnits) * 100}%` }} /></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="two">
        <section className="card">
          <div className="card-head"><h3>Peak 15-Minute Slots</h3><small className="muted">orders per slot</small></div>
          <div className="chart sm">
            {peaks.length === 0 ? (
              <div className="empty" style={{ padding: '24px 16px' }}>
                <span className="empty-code">NO SLOTS BOOKED</span>
                <p>Peak 15-minute slots populate automatically from live orders.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peaks.map((p) => ({ ...p, label: fmtTime(p.slot) }))} layout="vertical" margin={{ left: 12 }}>
                  <CartesianGrid horizontal={false} stroke="#E2E2DC" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#71717A' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: '#09090B', fontFamily: 'JetBrains Mono' }} width={74} tickLine={false} axisLine={false} />
                  <Tooltip {...tip} formatter={(v) => [v, 'Orders']} />
                  <Bar dataKey="orders" radius={[0, 2, 2, 0]}>
                    {peaks.map((p, i) => <Cell key={p.slot} fill={i === 0 ? ACCENT : INK} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h3>Stock Alerts</h3>
            <Link to="/owner/inventory" className="link">Inventory <ArrowRight size={13} /></Link>
          </div>
          {inv.out.length + inv.low.length === 0 ? (
            <div className="empty" style={{ padding: '24px 16px' }}>
              <span className="empty-code">HEALTHY</span>
              <p>All menu items are well stocked.</p>
            </div>
          ) : (
            <div className="alerts">
              {inv.out.map((i) => <div key={i.id} className="alert out"><AlertTriangle size={14} /> <b>{i.name}</b> is out of stock</div>)}
              {inv.low.map((i) => <div key={i.id} className="alert low"><AlertTriangle size={14} /> <b>{i.name}</b> low — {i.stock} left</div>)}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
