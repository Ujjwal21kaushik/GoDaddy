import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CheckCheck, Clock, IndianRupee, PackageX, Repeat, Sparkles } from 'lucide-react'
import { useApp } from '../../../store/AppContext.jsx'
import { demandStats, recommendations } from '../../../utils/analytics.js'
import { fmtHour, inr, isEffAvail } from '../../../utils/helpers.js'

const INK = '#09090B', ACCENT = '#FF3B1D', RED = '#E11D48'
const tip = { contentStyle: { borderRadius: 4, border: '1px solid #E2E2DC', fontSize: 12, backgroundColor: '#FFFFFF', fontFamily: 'JetBrains Mono' } }

export default function Demand() {
  const { state } = useApp()
  const [range, setRange] = useState('week')

  const d = demandStats(state, range)
  const recs = recommendations(state)
  const maxReq = d.topBy[0]?.requested || 1
  const maxH = Math.max(...d.hours.map((h) => h.missed), 1)

  return (
    <div className="stack">
      <div className="di-head">
        <div>
          <h2>Demand Intelligence</h2>
          <p className="muted">Live unfulfilled stockout requests, alternative recoveries, and prep targets from MongoDB.</p>
        </div>
        <div className="seg">
          <button className={range === 'today' ? 'on' : ''} onClick={() => setRange('today')}>Today</button>
          <button className={range === 'week' ? 'on' : ''} onClick={() => setRange('week')}>All Live</button>
        </div>
      </div>

      <div className="kpis">
        <div className="card kpi red">
          <span className="kpi-ic"><PackageX size={16} /></span>
          <small>Missed demand</small>
          <b>{d.units} units</b>
          <em>Requested while sold out</em>
        </div>
        <div className="card kpi red">
          <span className="kpi-ic"><IndianRupee size={16} /></span>
          <small>Est. lost sales</small>
          <b>{inr(d.lost)}</b>
          <em>of {inr(d.potential)} potential</em>
        </div>
        <div className="card kpi green">
          <span className="kpi-ic"><Repeat size={16} /></span>
          <small>Recovered via alts</small>
          <b>{inr(d.recovered)}</b>
          <em>Swapped to available items</em>
        </div>
        <div className="card kpi">
          <span className="kpi-ic"><CheckCheck size={16} /></span>
          <small>Recovery rate</small>
          <b>{d.recoveryRate}%</b>
          <em>Accepted suggested swap</em>
        </div>
      </div>

      <section className="card">
        <div className="card-head">
          <div className="row">
            <Sparkles size={17} color="#FF3B1D" />
            <div>
              <h3 style={{ margin: 0 }}>Live Prep Recommendations</h3>
              <small className="muted">Calculated strictly from live sold quantities + missed demand (+10% buffer)</small>
            </div>
          </div>
          <span className="tag">{recs.length} ITEMS</span>
        </div>

        {recs.length === 0 ? (
          <div className="empty" style={{ padding: '24px 16px' }}>
            <span className="empty-code">NO DEMAND YET</span>
            <p>Live prep suggestions populate automatically once orders or stockout requests arrive.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Sold</th>
                  <th>Missed</th>
                  <th>On Shelf</th>
                  <th>Suggested Prep</th>
                </tr>
              </thead>
              <tbody>
                {recs.map((r) => (
                  <tr key={r.item.id}>
                    <td><span className="t-emoji">{r.item.emoji}</span> <b>{r.item.name}</b></td>
                    <td className="mono">{r.sold}</td>
                    <td className="mono" style={{ color: r.missed > 0 ? 'var(--red)' : 'var(--mute)' }}>{r.missed}</td>
                    <td className="mono">{r.stock}</td>
                    <td><span className="tag amber">{r.rec} units</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="two">
        <section className="card">
          <div className="card-head"><h3>Top Unavailable Items</h3></div>
          {d.topBy.length === 0 ? (
            <div className="empty" style={{ padding: '24px 16px' }}>
              <span className="empty-code">ZERO STOCKOUTS</span>
              <p>No missed demand recorded in this period.</p>
            </div>
          ) : (
            <div className="rank">
              {d.topBy.map((i, n) => (
                <div key={i.id} className="rank-row">
                  <span className="rank-n red">{n + 1}</span>
                  <div className="grow">
                    <div className="rank-top">
                      <b>{i.name} {i.now && !isEffAvail(i.now) && <span className="tag red">Sold out</span>}</b>
                      <span className="mono">{i.requested} req</span>
                    </div>
                    <div className="bar red"><i style={{ width: `${(i.requested / maxReq) * 100}%` }} /></div>
                    <small className="muted">Lost {inr(i.lostValue)} · {i.recoveredUnits} recovered</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-head"><h3>Sales vs Missed Demand</h3><small className="mono">UNITS</small></div>
          <div className="chart">
            {d.vsSales.length === 0 ? (
              <div className="empty" style={{ padding: '24px 16px' }}>
                <span className="empty-code">NO DATA</span>
                <p>Chart appears once live sales are recorded.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.vsSales} margin={{ left: -10 }}>
                  <CartesianGrid vertical={false} stroke="#E2E2DC" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#71717A' }} interval={0} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#71717A' }} tickLine={false} axisLine={false} />
                  <Tooltip {...tip} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="sold" name="Actual sales" fill={INK} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="missed" name="Missed demand" fill={ACCENT} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h3><Clock size={15} /> Hourly Stockout Requests</h3>
          <div className="chips">
            {d.peak.map((p) => (
              <span key={p.from} className="chip">{fmtHour(p.from)}–{fmtHour(p.to)} · {p.missed} missed</span>
            ))}
          </div>
        </div>
        <div className="chart sm">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={d.hours.map((h) => ({ ...h, label: fmtHour(h.hour) }))}>
              <CartesianGrid vertical={false} stroke="#E2E2DC" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#71717A' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#71717A' }} tickLine={false} axisLine={false} allowDecimals={false} width={30} />
              <Tooltip {...tip} formatter={(v) => [v, 'Missed units']} />
              <Bar dataKey="missed" radius={[2, 2, 0, 0]}>
                {d.hours.map((h) => <Cell key={h.hour} fill={h.missed >= maxH * 0.75 && h.missed > 0 ? RED : INK} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
