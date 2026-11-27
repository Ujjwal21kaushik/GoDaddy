import { AlertTriangle, CheckCircle2, ChefHat, Clock, Flame, RotateCcw, Sparkles, Timer } from 'lucide-react'
import { useApp } from '../../store/AppContext.jsx'
import { kitchenLoad } from '../../utils/analytics.js'
import { fmtTime, isActive, orderUnits } from '../../utils/helpers.js'

const NEXT = {
  confirmed: ['ready', 'Mark Ready →'],
  preparing: ['ready', 'Mark Ready →'],
  almost: ['ready', 'Mark Ready →'],
  ready: ['delivered', 'Mark Delivered ✓'],
}

function Timing({ o, now }) {
  if (['delivered', 'collected'].includes(o.status)) {
    return <span className="t ok"><CheckCircle2 size={12} /> Delivered</span>
  }
  const d = o.slot - now
  if (o.status === 'ready') return <span className="t ok"><Clock size={12} /> Waiting for pickup</span>
  if (d < 0) return <span className="t late"><AlertTriangle size={12} /> Overdue {-d}m</span>
  if (d <= 5) return <span className="t urgent"><Flame size={12} /> Due in {d}m</span>
  return <span className="t"><Clock size={12} /> In {d}m</span>
}

export default function Kitchen() {
  const { state, orders, now, setStatus, resetDemo } = useApp()
  const live = orders
    .filter((o) => !['cancelled', 'collected', 'delivered', 'rejected', 'expired', 'pending_approval', 'counter_offer', 'cancel_requested'].includes(o.status))
    .sort((a, b) => a.slot - b.slot || b.createdAt - a.createdAt)
  const preparing = live.filter((o) => ['confirmed', 'preparing', 'almost'].includes(o.status))
  const ready = live.filter((o) => o.status === 'ready')
  const delivered = orders
    .filter((o) => ['delivered', 'collected'].includes(o.status) && o.day === 0)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 12)
  const load = kitchenLoad(state)
  const upcoming = preparing.slice(0, 6)

  const cancelHoldOrders = orders.filter((o) => o.status === 'cancel_requested')
  const futureBulkOrders = orders.filter((o) => o.isFuturePipelineOrder && !['collected', 'delivered', 'cancelled', 'rejected', 'expired', 'pending_approval', 'counter_offer', 'cancel_requested'].includes(o.status))

  const prep = {}
  live.filter(isActive).forEach((o) => (o.items || []).forEach((i) => { prep[i.name] = (prep[i.name] || 0) + i.qty }))
  const prepList = Object.entries(prep).sort((a, b) => b[1] - a[1]).slice(0, 8)

  const Card = ({ o }) => {
    const isDone = ['delivered', 'collected'].includes(o.status)
    const d = o.slot - now
    const cls = !isDone && o.status !== 'ready' && d < 0 ? 'late' : !isDone && o.status !== 'ready' && d <= 5 ? 'urgent' : ''
    const nx = NEXT[o.status]

    return (
      <div className={`k-card ${cls}`} style={isDone ? { opacity: 0.78, borderLeftColor: 'var(--green)' } : undefined}>
        <div className="k-top">
          <b>{o.id}</b>
          <span className="k-pick">{fmtTime(o.slot)}</span>
        </div>

        {o.isFuturePipelineOrder && !isDone && (
          <span className="tag violet" style={{ alignSelf: 'flex-start' }}>Cook-Ahead Pipeline</span>
        )}

        <Timing o={o} now={now} />

        <ul>
          {(o.items || []).map((i, idx) => (
            <li key={idx}>
              <b className="mono" style={{ color: 'var(--accent)' }}>{i.qty}×</b> {i.name}
            </li>
          ))}
        </ul>

        <div className="k-foot">
          <small>{o.name} · <span className="mono">{orderUnits(o)}</span> items</small>
          {nx ? (
            <button className={`btn-k ${o.status === 'ready' ? 'ready' : 'confirmed'}`} onClick={() => setStatus(o.id, nx[0])}>
              {nx[1]}
            </button>
          ) : (
            <span className="tag green">Delivered</span>
          )}
        </div>
      </div>
    )
  }

  const Col = ({ title, list, tone }) => (
    <section className={`k-col ${tone}`}>
      <h3>
        <span>{title}</span>
        <span className="k-count">{list.length}</span>
      </h3>
      {list.length === 0 ? (
        <div className="empty" style={{ padding: '26px 12px' }}>
          <span className="empty-code">CLEAR</span>
          <p style={{ fontSize: 12 }}>No orders in this stage</p>
        </div>
      ) : (
        list.map((o) => <Card key={o.id} o={o} />)
      )}
    </section>
  )

  return (
    <div className="page wide">
      <div className="page-head">
        <div>
          <h1 className="h1"><ChefHat size={24} color="#FF3B1D" /> Kitchen Display (KDS)</h1>
          <p className="muted">Fast 2-tap workflow: Preparing → Ready → Delivered</p>
        </div>
        <button className="btn-ghost sm" onClick={resetDemo}><RotateCcw size={13} /> Clear all orders</button>
      </div>

      {cancelHoldOrders.length > 0 && (
        <div className="notice red" style={{ marginBottom: 16 }}>
          <div className="row" style={{ fontWeight: 700, marginBottom: 4 }}>
            <AlertTriangle size={16} />
            <span>HOLD COOKING — Cancellation Request Pending Manager Approval</span>
          </div>
          {cancelHoldOrders.map((c) => (
            <div key={c.id} style={{ fontSize: 12 }}>
              • Order <b className="mono">{c.id}</b> ({c.name}) at <b className="mono">{fmtTime(c.slot)}</b> — pause preparation until Owner Approvals decides.
            </div>
          ))}
        </div>
      )}

      {futureBulkOrders.length > 0 && (
        <div className="notice amber" style={{ marginBottom: 18 }}>
          <div className="row" style={{ fontWeight: 700, marginBottom: 4 }}>
            <Sparkles size={16} />
            <span>Cook-Ahead Pipeline (Shelf Stock Protected for Walk-Ins)</span>
          </div>
          {futureBulkOrders.map((b) => (
            <div key={b.id} style={{ fontSize: 12 }}>
              • Order <b className="mono">{b.id}</b> ({b.name}): <b>{(b.items || []).map((i) => `${i.qty}× ${i.name}`).join(', ')}</b> for <b className="mono">{fmtTime(b.slot)}</b>
            </div>
          ))}
        </div>
      )}

      <div className="k-top-row">
        <div className="card meter">
          <div className="meter-top">
            <span className="row"><Timer size={15} /> Live Queue Load</span>
            <b className={`lvl ${load.level}`}>{load.level}</b>
          </div>
          <div className="meter-bar"><i className={load.level} style={{ width: `${Math.max(load.pct, 4)}%` }} /></div>
          <div className="meter-stats">
            <div><b>{live.length}</b><small>active orders</small></div>
            <div><b>{load.units}</b><small>items to cook</small></div>
            <div><b>~{load.waitMin}m</b><small>to clear queue</small></div>
          </div>
        </div>

        <div className="card">
          <h4 style={{ fontSize: 14 }}>Items to Cook Now</h4>
          {prepList.length === 0 ? (
            <p className="muted" style={{ marginTop: 10 }}>All active tickets are prepped.</p>
          ) : (
            <div className="prep-chips">
              {prepList.map(([n, c]) => <span key={n}><b>{c}</b>{n}</span>)}
            </div>
          )}
        </div>
      </div>

      <div className="k-layout">
        <div className="k-cols">
          <Col title="01 · Preparing" list={preparing} tone="pending" />
          <Col title="02 · Ready" list={ready} tone="prep" />
          <Col title="03 · Delivered" list={delivered} tone="ready" />
        </div>

        <aside className="card">
          <h4 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Upcoming Queue</h4>
          {upcoming.length === 0 ? (
            <p className="muted">No orders preparing.</p>
          ) : upcoming.map((o, i) => (
            <div key={o.id} className="up-row">
              <span className="up-n">0{i + 1}</span>
              <div className="grow">
                <b className="mono" style={{ display: 'block' }}>{o.id}</b>
                <small>{o.items.length} line{o.items.length > 1 ? 's' : ''} · {orderUnits(o)} items</small>
              </div>
              <span className="up-time">{fmtTime(o.slot)}</span>
            </div>
          ))}
          {preparing.length > upcoming.length && <small className="muted">+{preparing.length - upcoming.length} more</small>}
        </aside>
      </div>
    </div>
  )
}
