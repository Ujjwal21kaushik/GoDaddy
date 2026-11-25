import { AlertTriangle, ChefHat, Clock, Flame, RotateCcw, Timer, Sparkles, CheckCircle2 } from 'lucide-react'
import { useApp } from '../store/AppContext.jsx'
import { kitchenLoad } from '../utils/analytics.js'
import { fmtTime, isActive, orderUnits } from '../utils/helpers.js'

const NEXT = {
  confirmed: ['preparing', 'Start preparing ➔', '#ea580c', '#fff7ed'],
  preparing: ['almost', 'Almost ready ➔', '#f59e0b', '#fffbeb'],
  almost: ['ready', 'Mark ready for pickup 🔔', '#10b981', '#ecfdf5'],
  ready: ['collected', 'Handed over / Collected ✓', '#64748b', '#f1f5f9']
}

function Timing({ o, now }) {
  const d = o.slot - now
  if (o.status === 'ready') return <span className="t ok" style={{ color: '#059669', fontWeight: 'bold' }}><Clock size={13} /> Waiting for pickup</span>
  if (d < 0) return <span className="t late" style={{ color: '#dc2626', fontWeight: 'bold' }}><AlertTriangle size={13} /> Overdue {-d} min</span>
  if (d <= 5) return <span className="t urgent" style={{ color: '#ea580c', fontWeight: 'bold' }}><Flame size={13} /> Due in {d} min</span>
  return <span className="t" style={{ color: '#475569', fontWeight: '600' }}><Clock size={13} /> In {d} min</span>
}

export default function Kitchen() {
  const { state, orders, now, setStatus, resetDemo } = useApp()
  const live = orders.filter((o) => o.status !== 'cancelled' && o.status !== 'collected').sort((a, b) => a.slot - b.slot || b.createdAt - a.createdAt)
  const pending = live.filter((o) => o.status === 'confirmed')
  const preparing = live.filter((o) => o.status === 'preparing' || o.status === 'almost')
  const ready = live.filter((o) => o.status === 'ready')
  const load = kitchenLoad(state)
  const upcoming = pending.slice(0, 6)

  const futureBulkOrders = orders.filter(o => o.isFuturePipelineOrder && o.status !== 'collected')

  const prep = {}
  live.filter(isActive).forEach((o) => (o.items || []).forEach((i) => { prep[i.name] = (prep[i.name] || 0) + i.qty }))
  const prepList = Object.entries(prep).sort((a, b) => b[1] - a[1]).slice(0, 8)

  const Card = ({ o }) => {
    const d = o.slot - now
    const cls = o.status !== 'ready' && d < 0 ? 'late' : o.status !== 'ready' && d <= 5 ? 'urgent' : ''
    const nx = NEXT[o.status]

    // Custom background per status
    const cardBg = o.status === 'ready' 
      ? '#f0fdf4' 
      : (o.status === 'preparing' || o.status === 'almost' ? '#fffdf5' : '#ffffff')
    const borderColor = o.status === 'ready' 
      ? '#86efac' 
      : (o.status === 'preparing' || o.status === 'almost' ? '#fde68a' : '#fed7aa')

    return (
      <div 
        className={`k-card ${cls}`}
        style={{
          backgroundColor: cardBg,
          border: `1.5px solid ${borderColor}`,
          borderRadius: '14px',
          boxShadow: '0 4px 10px rgba(0,0,0,0.04)',
          marginBottom: '14px',
          padding: '14px'
        }}
      >
        <div className="k-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <b style={{ fontSize: '16px', color: '#0f172a' }}>{o.id}</b>
          <span style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
            Slot: {fmtTime(o.slot)}
          </span>
        </div>

        {o.isFuturePipelineOrder && (
          <span style={{ fontSize: '10px', backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', display: 'inline-block', marginBottom: '6px' }}>
            ⚡ Cook-Ahead Pipeline
          </span>
        )}

        <Timing o={o} now={now} />

        <ul style={{ margin: '8px 0', paddingLeft: '18px', fontSize: '13px', color: '#334155' }}>
          {(o.items || []).map((i, idx) => (
            <li key={idx} style={{ marginBottom: '2px' }}>
              <span style={{ fontWeight: '800', color: '#ea580c' }}>{i.qty}×</span> {i.name}
            </li>
          ))}
        </ul>

        <div className="k-foot" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '10px', marginTop: '6px' }}>
          <small style={{ fontWeight: '600', color: '#64748b' }}>
            {o.name} · {orderUnits(o)} items
          </small>
          {nx && (
            <button 
              className={`btn-k ${o.status}`} 
              onClick={() => setStatus(o.id, nx[0])}
              style={{
                backgroundColor: nx[2],
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '7px 12px',
                fontWeight: 'bold',
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
              }}
            >
              {nx[1]}
            </button>
          )}
        </div>
      </div>
    )
  }
  
  const Col = ({ title, list, tone, headerBg, countBg }) => (
    <section 
      className={`k-col ${tone}`}
      style={{
        backgroundColor: headerBg,
        borderRadius: '16px',
        padding: '16px',
        border: '1px solid rgba(0,0,0,0.06)'
      }}
    >
      <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 14px 0', fontSize: '15px', color: '#0f172a' }}>
        <span>{title}</span>
        <span style={{ backgroundColor: countBg, color: '#fff', padding: '2px 9px', borderRadius: '99px', fontSize: '12px', fontWeight: 'bold' }}>
          {list.length}
        </span>
      </h3>
      {list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8', fontSize: '13px', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: '12px' }}>
          No orders in this stage
        </div>
      ) : (
        list.map((o) => <Card key={o.id} o={o} />)
      )}
    </section>
  )

  return (
    <div className="page wide">
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 className="h1"><ChefHat size={28} color="#ea580c" /> Kitchen Production Board (KDS)</h1>
          <p className="muted">Live real-time production flow with colored stage backgrounds</p>
        </div>
        <button className="btn-ghost" onClick={resetDemo}><RotateCcw size={14} /> Clear all orders</button>
      </div>

      {futureBulkOrders.length > 0 && (
        <div style={{ backgroundColor: '#fffbeb', border: '2px solid #f59e0b', borderRadius: '14px', padding: '16px 20px', marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400e', fontWeight: 'bold', marginBottom: '8px' }}>
            <Sparkles size={18} />
            <span>Smart Cook-Ahead Batch Alerts (Ready Stock Protected for Immediate Students!)</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {futureBulkOrders.map(b => (
              <div key={b.id} style={{ fontSize: '13px', color: '#78350f' }}>
                • <strong>Order {b.id} ({b.name}):</strong> Needs <strong>{(b.items || []).map(i => `${i.qty}x ${i.name}`).join(', ')}</strong> at <strong>{fmtTime(b.slot)}</strong>. Start fresh fry batch ~30 mins before.
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="k-top-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        <div className="card meter">
          <div className="meter-top"><span><Timer size={15} /> Live queue load</span><b className={`lvl ${load.level}`}>{load.level}</b></div>
          <div className="meter-bar"><i className={load.level} style={{ width: `${Math.max(load.pct, 4)}%` }} /></div>
          <div className="meter-stats">
            <div><b>{live.length}</b><small>active orders</small></div>
            <div><b>{load.units}</b><small>items to make</small></div>
            <div><b>~{load.waitMin}m</b><small>to clear queue</small></div>
          </div>
        </div>
        <div className="card prep-list">
          <h4>Items to cook right now</h4>
          {prepList.length === 0 ? <p className="muted">All orders prepared 🎉</p> : <div className="prep-chips">{prepList.map(([n, c]) => <span key={n}><b>{c}</b> {n}</span>)}</div>}
        </div>
      </div>

      {/* 3-COLUMN COLORED STAGES */}
      <div className="k-layout">
        <div className="k-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <Col 
            title="1. Pending (Incoming)" 
            list={pending} 
            tone="pending" 
            headerBg="#fff7ed" 
            countBg="#ea580c" 
          />
          <Col 
            title="2. Preparing (Cooking)" 
            list={preparing} 
            tone="prep" 
            headerBg="#fffbeb" 
            countBg="#f59e0b" 
          />
          <Col 
            title="3. Ready for Pickup 🔔" 
            list={ready} 
            tone="ready" 
            headerBg="#ecfdf5" 
            countBg="#10b981" 
          />
        </div>
        
        <aside className="card upcoming">
          <h4>Upcoming queue</h4>
          {upcoming.length === 0 ? <p className="muted">No orders in queue.</p> : upcoming.map((o, i) => (
            <div key={o.id} className="up-row"><span className="up-n">{i + 1}</span><div className="grow"><b>{o.id}</b><small>{o.items.length} line{o.items.length > 1 ? 's' : ''} · {orderUnits(o)} items</small></div><span className="up-time">{fmtTime(o.slot)}</span></div>
          ))}
          {pending.length > upcoming.length && <small className="muted">+{pending.length - upcoming.length} more</small>}
        </aside>
      </div>
    </div>
  )
}
