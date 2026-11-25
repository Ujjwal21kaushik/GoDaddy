import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, CheckCircle2, Hourglass, IndianRupee, ArrowRight, ShoppingBag, TrendingUp, ShieldAlert, UserX } from 'lucide-react'
import { useApp } from '../../store/AppContext.jsx'
import { demandStats, hourlySales, inventorySummary, peakSlots, todayStats, topItems, weeklySales } from '../../utils/analytics.js'
import { fmtHour, fmtTime, inr } from '../../utils/helpers.js'

const GOLD = '#E8A800', INK = '#1c1c1c'
const tip = { contentStyle: { borderRadius: 10, border: '1px solid #eee', fontSize: 12 }, cursor: { fill: 'rgba(248,203,70,.18)' } }

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

  // Orders not collected >30 mins after slot
  const uncollectedOrders = orders.filter((o) => {
    return o.status !== 'collected' && o.status !== 'cancelled' && (now > o.slot + 30)
  })

  const cancelAndBlacklist = (order) => {
    dispatch({ type: 'STATUS', id: order.id, status: 'cancelled' })
    toast(`Order ${order.id} cancelled. User marked for canteen pickup violation!`, 'warn')
  }

  const kpis = [
    { icon: IndianRupee, label: 'Revenue today', value: inr(t.revenue), sub: `Avg order ${inr(t.aov)}` },
    { icon: ShoppingBag, label: 'Total orders', value: t.total, sub: 'incl. pre-booked slots' },
    { icon: CheckCircle2, label: 'Completed', value: t.completed, sub: `${Math.round((t.completed / t.total) * 100)}% done`, tone: 'green' },
    { icon: Hourglass, label: 'Pending', value: t.pending, sub: 'in queue or awaiting pickup', tone: 'amber' },
  ]

  return (
    <div className="stack">
      {/* HIGH PRIORITY OVERDUE UNCOLLECTED ALERT */}
      {uncollectedOrders.length > 0 && (
        <section className="card" style={{ border: '2px solid #ef4444', backgroundColor: '#fef2f2', padding: '18px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldAlert size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#991b1b', fontSize: '16px', fontWeight: '800' }}>
                  🚨 {uncollectedOrders.length} Uncollected Overdue Order{uncollectedOrders.length > 1 ? 's' : ''} (&gt;30 Mins Past Pickup)
                </h3>
                <small style={{ color: '#b91c1c' }}>
                  Food is getting cold at the counter. Review student details or blacklist to restock inventory.
                </small>
              </div>
            </div>
            <Link to="/owner/slots" style={{ fontSize: '13px', fontWeight: '700', color: '#dc2626', textDecoration: 'underline' }}>
              Manage in Slot Manager →
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {uncollectedOrders.map((o) => (
              <div 
                key={o.id} 
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #fecaca',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <b style={{ color: '#0f172a', fontSize: '14px' }}>{o.id}</b>
                    <span style={{ fontSize: '11px', backgroundColor: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '99px', fontWeight: 'bold' }}>
                      Overdue by {now - o.slot} mins
                    </span>
                  </div>
                  <small style={{ color: '#64748b', display: 'block', marginTop: '2px' }}>
                    Student: <b>{o.name || 'Anonymous Student'}</b> · Slot was <b>{fmtTime(o.slot)}</b> · Items: {(o.items || []).map(i => `${i.qty}× ${i.name}`).join(', ')}
                  </small>
                </div>

                <button 
                  onClick={() => cancelAndBlacklist(o)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <UserX size={14} /> Blacklist & Restock
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="kpis">
        {kpis.map((k) => (
          <div key={k.label} className={`card kpi ${k.tone || ''}`}>
            <span className="kpi-ic"><k.icon size={18} /></span>
            <small>{k.label}</small><b>{k.value}</b><em>{k.sub}</em>
          </div>
        ))}
      </div>

      <Link to="/owner/demand" className="demand-teaser">
        <div><TrendingUp size={20} /><div><b>You lost {inr(d.lost)} this week to sold-out items</b>
          <small>{d.units} units requested but unavailable · {d.recoveryRate}% recovered through alternatives</small></div></div>
        <span>See Demand Intelligence <ArrowRight size={15} /></span>
      </Link>

      <div className="two">
        <section className="card">
          <div className="card-head"><h3>Sales</h3>
            <div className="seg"><button className={view === 'daily' ? 'on' : ''} onClick={() => setView('daily')}>Daily</button><button className={view === 'weekly' ? 'on' : ''} onClick={() => setView('weekly')}>Weekly</button></div></div>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              {view === 'daily' ? (
                <BarChart data={hourly}><CartesianGrid vertical={false} stroke="#eee" /><XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} /><YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip {...tip} formatter={(v) => [inr(v), 'Revenue']} /><Bar dataKey="revenue" fill={GOLD} radius={[6, 6, 0, 0]} /></BarChart>
              ) : (
                <LineChart data={weekly}><CartesianGrid vertical={false} stroke="#eee" /><XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} /><YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                  <Tooltip {...tip} formatter={(v, n) => [n === 'revenue' ? inr(v) : v, n === 'revenue' ? 'Revenue' : 'Orders']} /><Line type="monotone" dataKey="revenue" stroke={GOLD} strokeWidth={3} dot={{ r: 4, fill: GOLD }} /></LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card">
          <div className="card-head"><h3>Top 5 selling items</h3>
            <div className="seg"><button className={range === 'today' ? 'on' : ''} onClick={() => setRange('today')}>Today</button><button className={range === 'week' ? 'on' : ''} onClick={() => setRange('week')}>Week</button></div></div>
          <div className="rank">
            {top.map((i, n) => (
              <div key={i.id} className="rank-row"><span className="rank-n">{n + 1}</span><span className="rank-e">{i.emoji}</span>
                <div className="grow"><div className="rank-top"><b>{i.name}</b><span>{i.units} sold</span></div><div className="bar"><i style={{ width: `${(i.units / maxUnits) * 100}%` }} /></div></div></div>
            ))}
          </div>
        </section>
      </div>

      <div className="two">
        <section className="card">
          <div className="card-head"><h3>Peak 15-minute slots</h3><small className="muted">orders per slot</small></div>
          <div className="chart sm">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peaks.map((p) => ({ ...p, label: fmtTime(p.slot) }))} layout="vertical" margin={{ left: 12 }}>
                <CartesianGrid horizontal={false} stroke="#eee" /><XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} /><YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={70} tickLine={false} axisLine={false} />
                <Tooltip {...tip} formatter={(v) => [v, 'Orders']} /><Bar dataKey="orders" radius={[0, 6, 6, 0]}>{peaks.map((p, i) => <Cell key={p.slot} fill={i === 0 ? INK : GOLD} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card">
          <div className="card-head"><h3>Stock alerts</h3><Link to="/owner/inventory" className="link">Inventory <ArrowRight size={13} /></Link></div>
          {inv.out.length + inv.low.length === 0 && <p className="muted">All items are well stocked.</p>}
          <div className="alerts">
            {inv.out.map((i) => <div key={i.id} className="alert out"><AlertTriangle size={14} /> <b>{i.name}</b> is out of stock</div>)}
            {inv.low.map((i) => <div key={i.id} className="alert low"><AlertTriangle size={14} /> <b>{i.name}</b> low — {i.stock} left</div>)}
          </div>
        </section>
      </div>
    </div>
  )
}
