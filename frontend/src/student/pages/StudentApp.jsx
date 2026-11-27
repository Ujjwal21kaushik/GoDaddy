import { useMemo, useState, useEffect } from 'react'
import { Activity, ArrowRight, Flame, MapPin, Search, ShoppingBag, Sparkles, X, UtensilsCrossed } from 'lucide-react'
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, Cell } from 'recharts'
import { useApp } from '../../store/AppContext.jsx'
import { CATEGORIES } from '../../data/categories.js'
import { cartSummary, fmtTime, inr, isEffAvail, nextBoundary, SLOT_LABEL } from '../../utils/helpers.js'
import FoodCard from '../components/FoodCard.jsx'

const CANTEEN_TIPS = [
  'Lock your 15-minute pickup slot early so the kitchen prepares your order on time.',
  'Orders within shelf stock confirm right away; larger or >1 hr future orders go to Pre-Order approval.',
  'Need food more than 1 hour later? Pick a pre-order slot so live counter stock stays free for walk-ins.',
  'Batch prep runs in parallel — ordering multiple items prepares simultaneously.'
]

export default function StudentApp() {
  const { state, menu, combos, setCartOpen, addCombo, now, hours, slot: slotInfo, slotCounts } = useApp()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [factIndex, setFactIndex] = useState(0)
  const sum = useMemo(() => cartSummary(state.cart, menu, combos), [state.cart, menu, combos])
  const query = q.trim().toLowerCase()

  useEffect(() => {
    const timer = setInterval(() => setFactIndex((prev) => (prev + 1) % CANTEEN_TIPS.length), 6000)
    return () => clearInterval(timer)
  }, [])

  const filtered = useMemo(() => menu.filter((i) =>
    (cat === 'all' || i.cat === cat) && (!query || `${i.name} ${i.cat} ${i.desc}`.toLowerCase().includes(query))), [menu, cat, query])
  const popular = useMemo(() => menu.filter((i) => i.popular), [menu])
  const activeCombos = useMemo(
    () => (combos || []).filter((c) => c && c.active !== false && Array.isArray(c.items) && c.items.length > 0),
    [combos]
  )
  const browsing = !query && cat === 'all'

  const rushData = useMemo(() => {
    const start = Math.max(nextBoundary(now), hours.open)
    const out = []
    for (let m = start; m < hours.close && out.length < 6; m += 15) {
      const s = slotInfo(m)
      out.push({ time: fmtTime(m).replace(/ (AM|PM)/, ''), fullTime: fmtTime(m), load: s.pct, used: s.used, cap: s.cap, label: SLOT_LABEL[s.state] })
    }
    return out
  }, [now, hours.open, hours.close, slotCounts, state.caps])

  const busiest = rushData.reduce((mx, x) => (x.load > (mx?.load ?? -1) ? x : mx), null)

  return (
    <div className="student">
      <main className="s-main">
        {/* TOP LOCATION & SEARCH TOOLBAR */}
        <div className="s-toolbar">
          <div className="s-loc">
            <MapPin size={15} color="#FF3B1D" />
            <span><b>Main Campus Canteen</b> · 15-min pickup windows</span>
          </div>
          <div className="search">
            <Search size={16} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder='Search "dosa", "samosa", "chai"…'
              aria-label="Search food"
            />
            {q && (
              <button onClick={() => setQ('')} aria-label="Clear search">
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* LIVE TIP TICKER */}
        <div className="ticker">
          <span className="ticker-tag">LIVE TIP</span>
          <span className="grow">{CANTEEN_TIPS[factIndex]}</span>
        </div>

        {browsing && (
          <div className="hero-grid">
            <section className="hero">
              <div>
                <div className="hero-kicker">ORDERQUICK // CAMPUS DROP</div>
                <h1 style={{ marginTop: 10 }}>
                  Skip the line.<br />Pick up in <span>15 min</span>.
                </h1>
                <p>Lock your slot before the rush hits, track live kitchen prep, and grab hot food without waiting.</p>
              </div>
              <div className="hero-meta">
                <span className="hero-stat">ZERO QUEUE</span>
                <span className="hero-stat">BATCH PREP TIMING</span>
                <span className="hero-stat">PRE-ORDER READY</span>
              </div>
            </section>

            <section className="rush-card">
              <div>
                <div className="row between" style={{ marginBottom: 6 }}>
                  <b style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                    <Activity size={16} color="#FF3B1D" /> Live Canteen Rush
                  </b>
                  <span className={`tag ${busiest && busiest.load > 70 ? 'red' : 'green'}`}>
                    {busiest && busiest.load > 0 ? `PEAK ${busiest.fullTime}` : 'QUIET NOW'}
                  </span>
                </div>
                <small className="muted" style={{ display: 'block', marginBottom: 10 }}>
                  Live capacity across the next 6 pickup windows.
                </small>
              </div>
              <div style={{ height: 104, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rushData} margin={{ top: 4, right: 0, bottom: 0, left: -26 }}>
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#71717A', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                    <Tooltip content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const p = payload[0].payload
                        return (
                          <div style={{ backgroundColor: '#09090B', color: '#FFFFFF', padding: '4px 9px', borderRadius: 4, fontSize: 11, fontFamily: 'JetBrains Mono' }}>
                            <b>{p.fullTime}</b> · {p.used}/{p.cap} ({p.label})
                          </div>
                        )
                      }
                      return null
                    }} />
                    <Bar dataKey="load" radius={[2, 2, 0, 0]}>
                      {rushData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.load > 70 ? '#FF3B1D' : (entry.load > 40 ? '#D97706' : '#059669')} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        )}

        {/* CATEGORY FILTER */}
        <div className="cats">
          {CATEGORIES.map((c) => (
            <button key={c.id} className={cat === c.id ? 'on' : ''} onClick={() => setCat(c.id)}>
              <span>{c.emoji}</span>{c.label}
            </button>
          ))}
        </div>

        {/* ACTIVE COMBOS */}
        {browsing && activeCombos.length > 0 && (
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: activeCombos.length > 1 ? 'repeat(auto-fit, minmax(320px, 1fr))' : '1fr' }}>
            {activeCombos.map((c) => {
              const cItems = c.items.map((ci) => ({ ...ci, item: menu.find((m) => m.id === ci.id) })).filter((ci) => ci.item)
              const cOk = cItems.length === c.items.length && cItems.every((ci) => isEffAvail(ci.item))
              const cOriginal = cItems.reduce((s, ci) => s + ci.item.price * (ci.qty || 1), 0)
              const cSave = Math.max(0, cOriginal - Number(c.price || 0))
              const tagline = c.tagline || cItems.map((ci) => `${ci.qty > 1 ? `${ci.qty}× ` : ''}${ci.item.name}`).join(' + ')
              return (
                <section key={c.id} className={`combo ${cOk ? '' : 'off'}`}>
                  <div className="combo-tag"><Sparkles size={11} /> {activeCombos.length === 1 ? 'Combo of the Day' : 'Combo Deal'}</div>
                  <div className="combo-body">
                    <div className="combo-emojis">{cItems.map((ci) => <span key={ci.item.id}>{ci.item.emoji}</span>)}</div>
                    <div className="grow">
                      <h3>{c.name}</h3>
                      <p>{tagline}</p>
                      <div className="combo-price">
                        <b>{inr(c.price)}</b>
                        {cOriginal > c.price && <s>{inr(cOriginal)}</s>}
                        {cSave > 0 && <em>SAVE {inr(cSave)}</em>}
                      </div>
                    </div>
                    <button className="btn-primary" onClick={() => addCombo(c)}>
                      {cOk ? 'Add Combo' : 'Sold Out'}
                    </button>
                  </div>
                </section>
              )
            })}
          </div>
        )}

        {/* TRENDING CAROUSEL */}
        {browsing && (
          <section>
            <h2 className="sec"><Flame size={17} color="#FF3B1D" /> Trending Now <small>FAST MOVING</small></h2>
            <div className="h-scroll">{popular.map((i) => <FoodCard key={i.id} item={i} compact />)}</div>
          </section>
        )}

        {/* MAIN MENU GRID */}
        <section>
          <h2 className="sec">
            {query ? `Results for “${q.trim()}”` : cat === 'all' ? 'All Menu Items' : cat}
            <small>{filtered.length}</small>
          </h2>
          {filtered.length === 0 ? (
            <div className="empty">
              <span className="empty-code">NO RESULTS</span>
              <div className="empty-icon"><UtensilsCrossed size={20} /></div>
              <b>Nothing matched “{q.trim() || cat}”</b>
              <p>Try searching for Samosa, Thali, Chai, or browse the full menu again.</p>
              <button className="btn-primary" onClick={() => { setQ(''); setCat('all') }}>
                Browse again
              </button>
            </div>
          ) : (
            <div className="grid">{filtered.map((i) => <FoodCard key={i.id} item={i} />)}</div>
          )}
        </section>
      </main>

      {sum.units > 0 && (
        <button className="float-cart" onClick={() => setCartOpen(true)}>
          <span><ShoppingBag size={15} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />{sum.units} item{sum.units > 1 ? 's' : ''} in bag</span>
          <b>Pick Slot · {inr(sum.total)} <ArrowRight size={14} style={{ verticalAlign: 'text-bottom' }} /></b>
        </button>
      )}
    </div>
  )
}
