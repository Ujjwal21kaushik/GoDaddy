import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Flame, MapPin, Receipt, Search, ShoppingBag, Sparkles, X, Activity, Lightbulb, Clock, CheckCircle } from 'lucide-react'
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, Cell } from 'recharts'
import { useApp } from '../../store/AppContext.jsx'
import { CATEGORIES, COMBO } from '../../data/mock.js'
import { cartSummary, inr, isActive, isEffAvail, fmtTime } from '../../utils/helpers.js'
import FoodCard from '../../components/student/FoodCard.jsx'
import CartDrawer from '../../components/student/CartDrawer.jsx'
import AlternativeModal from '../../components/student/AlternativeModal.jsx'

const CANTEEN_FUN_FACTS = [
  "💡 Did you know? Over 48% of all Samosa orders occur between 1:00 PM - 1:15 PM!",
  "⚡ Fun Fact: Ordering in advance saves you an average of 14.5 minutes in physical queue time.",
  "☕ Pro Tip: Friday afternoon chai rush peaks at 3:15 PM — pre-book your slot to skip the wait!",
  "🍔 Chef Insight: Special Masala Maggi takes only 4 mins to prepare when pre-ordered in a quiet slot.",
  "🥟 Samosa Trivia: 1,234 samosas were ordered this month across college departments!"
]

export default function StudentApp() {
  const { state, menu, orders, setCartOpen, altItem, addCombo, now } = useApp()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [factIndex, setFactIndex] = useState(0)
  const sum = useMemo(() => cartSummary(state.cart, menu, COMBO), [state.cart, menu])
  const query = q.trim().toLowerCase()

  // Rotate fun fact every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % CANTEEN_FUN_FACTS.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  const filtered = useMemo(() => menu.filter((i) =>
    (cat === 'all' || i.cat === cat) && (!query || `${i.name} ${i.cat} ${i.desc}`.toLowerCase().includes(query))), [menu, cat, query])
  const popular = useMemo(() => menu.filter((i) => i.popular).sort((a, b) => b.weekUnits - a.weekUnits), [menu])
  const comboItems = COMBO.items.map((c) => menu.find((m) => m.id === c.id)).filter(Boolean)
  const comboOk = comboItems.length === COMBO.items.length && comboItems.every(isEffAvail)
  const comboOriginal = comboItems.reduce((s, i) => s + i.price, 0)
  const mine = orders.filter((o) => o.mine && o.day === 0 && isActive(o))
  const browsing = !query && cat === 'all'

  // Visual Rush Hour Heatmap data for students (Visualizing slot rush so students pick quieter times)
  const rushData = useMemo(() => [
    { time: '12:30', load: 25, label: 'Quiet' },
    { time: '12:45', load: 55, label: 'Moderate' },
    { time: '1:00 PM', load: 100, label: 'Peak Rush 🔥' },
    { time: '1:15 PM', load: 85, label: 'Busy' },
    { time: '1:30 PM', load: 45, label: 'Moderate' },
    { time: '1:45 PM', load: 20, label: 'Quiet' }
  ], [])

  return (
    <div className="student">
      <header className="s-head">
        <div className="s-head-in">
          <div className="s-logo">
            <span>CanteenIQ</span>
            <small><MapPin size={12} color="#ff6b00" /> Main Campus Canteen · 15-Min Slots</small>
          </div>
          <div className="search">
            <Search size={18} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder='Search "dosa", "samosa", "chai"…' aria-label="Search food" />
            {q && <button onClick={() => setQ('')} aria-label="Clear search"><X size={16} /></button>}
          </div>
          <Link to="/orders" className="s-link">
            <Receipt size={17} /> 
            <span>My Orders</span>
            {mine.length > 0 && <i className="badge">{mine.length}</i>}
          </Link>
          <button className="cart-btn" onClick={() => setCartOpen(true)}>
            <ShoppingBag size={18} />
            {sum.units > 0 ? <span>{sum.units} item{sum.units > 1 ? 's' : ''} · {inr(sum.total)}</span> : <span>Cart</span>}
          </button>
        </div>
      </header>

      <main className="s-main">
        {/* INTERACTIVE FUN FACT TICKER */}
        <div style={{
          backgroundColor: '#fff7ed',
          border: '1px solid #ffedd5',
          borderRadius: '14px',
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
          boxShadow: '0 2px 6px rgba(255,107,0,0.06)'
        }}>
          <span style={{ fontSize: '18px', animation: 'bounce 2s infinite' }}>✨</span>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#9a3412', flex: 1 }}>
            {CANTEEN_FUN_FACTS[factIndex]}
          </p>
          <span style={{ fontSize: '11px', color: '#ea580c', backgroundColor: '#fed7aa', padding: '2px 8px', borderRadius: '99px', fontWeight: 'bold' }}>
            Live Tip
          </span>
        </div>

        {browsing && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px', marginBottom: '24px' }}>
            {/* HERO BANNER */}
            <section className="hero" style={{ margin: 0 }}>
              <div>
                <h1>Skip the canteen line.<br />Pick up in <u>15 minutes</u>.</h1>
                <p>Order food in advance, avoid the 1:00 PM bottleneck, and collect when hot.</p>
              </div>
              <div className="hero-emoji">🥟🍛☕</div>
            </section>

            {/* LIVE QUEUE VISUALIZER GRAPH */}
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '24px',
              padding: '20px 24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Activity size={18} color="#ea580c" />
                  <b style={{ fontSize: '14px', color: '#0f172a' }}>Live Canteen Rush Meter</b>
                </div>
                <span style={{ fontSize: '11px', backgroundColor: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '99px', fontWeight: 'bold' }}>
                  Peak: 1:00 PM
                </span>
              </div>
              <small style={{ color: '#64748b', fontSize: '12px', marginBottom: '12px' }}>
                Pick lighter slots (12:30 or 1:45 PM) for near-instant 3-minute food pickup!
              </small>
              <div style={{ height: '90px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rushData} margin={{ top: 5, right: 0, bottom: 0, left: -25 }}>
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div style={{ backgroundColor: '#0f172a', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontSize: '11px' }}>
                            <b>{payload[0].payload.time}</b>: {payload[0].payload.label}
                          </div>
                        )
                      }
                      return null
                    }} />
                    <Bar dataKey="load" radius={[4, 4, 0, 0]}>
                      {rushData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.load > 70 ? '#ea580c' : (entry.load > 40 ? '#f59e0b' : '#10b981')} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* CATEGORY PILL SELECTOR */}
        <div className="cats">
          {CATEGORIES.map((c) => (
            <button key={c.id} className={cat === c.id ? 'on' : ''} onClick={() => setCat(c.id)}>
              <span>{c.emoji}</span>{c.label}
            </button>
          ))}
        </div>

        {/* COMBO OF THE DAY */}
        {browsing && (
          <section className={`combo ${comboOk ? '' : 'off'}`}>
            <div className="combo-tag"><Sparkles size={13} /> Combo of the Day</div>
            <div className="combo-body">
              <div className="combo-emojis">{comboItems.map((i) => <span key={i.id}>{i.emoji}</span>)}</div>
              <div className="grow">
                <h3>{COMBO.name}</h3>
                <p>{COMBO.tagline}</p>
                <div className="combo-price">
                  <b>{inr(COMBO.price)}</b>
                  <s>{inr(comboOriginal)}</s>
                  <em>Save {inr(comboOriginal - COMBO.price)}</em>
                </div>
              </div>
              <button className="btn-primary" onClick={addCombo}>{comboOk ? 'Add Combo' : 'Sold Out'}</button>
            </div>
          </section>
        )}

        {/* POPULAR RIGHT NOW HORIZONTAL CAROUSEL */}
        {browsing && (
          <section>
            <h2 className="sec"><Flame size={20} color="#ea580c" /> Student Favorites <small>Fast Moving</small></h2>
            <div className="h-scroll">{popular.map((i) => <FoodCard key={i.id} item={i} compact />)}</div>
          </section>
        )}

        {/* MAIN FOOD GRID */}
        <section>
          <h2 className="sec">
            {query ? `Search results for “${q.trim()}”` : cat === 'all' ? 'All Canteen Items' : cat} 
            <small>{filtered.length}</small>
          </h2>
          {filtered.length === 0 ? (
            <div className="empty">
              <div className="empty-emoji">🔍</div>
              <b>No matching items found</b>
              <p>Try searching for Samosa, Thali, Chai, or clear your filter.</p>
              <button className="btn-primary" onClick={() => { setQ(''); setCat('all') }}>View All Menu</button>
            </div>
          ) : (
            <div className="grid">{filtered.map((i) => <FoodCard key={i.id} item={i} />)}</div>
          )}
        </section>
      </main>

      {sum.units > 0 && (
        <button className="float-cart" onClick={() => setCartOpen(true)}>
          <span><ShoppingBag size={18} /> {sum.units} item{sum.units > 1 ? 's' : ''} in cart</span>
          <b>Select Slot & Pay {inr(sum.total)} ➔</b>
        </button>
      )}

      <CartDrawer />
      {altItem && <AlternativeModal item={altItem} onClose={() => setAltItem(null)} />}
    </div>
  )
}
