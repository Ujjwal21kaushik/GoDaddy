import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Clock, Receipt, RotateCcw } from 'lucide-react'
import { useApp } from '../../store/AppContext.jsx'
import { fmtTime, inr, isActive, isEffAvail, isPendingApproval, STATUS_LABEL } from '../../utils/helpers.js'
import OrderStepper from '../../components/OrderStepper.jsx'

export default function MyOrders() {
  const { studentOrders, menu, dispatch, toast, setCartOpen, user } = useApp()
  const nav = useNavigate()
  const userKey = user?.username?.toLowerCase()
  const mine = studentOrders
    .filter((o) => !o.usernameKey || (userKey && o.usernameKey === userKey))
    .sort((a, b) => b.createdAt - a.createdAt)
  const active = mine.filter(isActive).concat(mine.filter((o) => o.status === 'ready' || isPendingApproval(o)))
  const past = mine.filter((o) => !active.includes(o))

  const reorder = (o) => {
    let added = 0, skipped = 0
    o.items.forEach((i) => {
      const it = menu.find((m) => m.id === i.id)
      if (isEffAvail(it)) {
        dispatch({ type: 'CART_SET', id: it.id, qty: Math.min(i.qty, it.stock) })
        added++
      } else skipped++
    })
    toast(skipped ? `Added ${added}, ${skipped} unavailable now` : 'Items added to bag', skipped ? 'warn' : 'ok')
    nav('/')
    setCartOpen(true)
  }

  const Card = ({ o }) => {
    const isLive = !['delivered', 'collected', 'cancelled', 'rejected', 'expired'].includes(o.status)

    return (
      <div className="card" style={{ marginBottom: 12, borderColor: isLive ? 'var(--ink)' : 'var(--line)' }}>
        <div className="row between" style={{ alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div className="row">
              <b className="mono" style={{ fontSize: 16 }}>{o.id}</b>
              {isLive && <span className="sync-dot" title="Live order" />}
            </div>
            <small style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
              <Clock size={12} /> {o.day === 0 ? 'Today' : 'Earlier'} · Slot <b className="mono">{fmtTime(o.slot)}</b>
            </small>
          </div>
          <span className={`pill st-${o.status}`}>
            {STATUS_LABEL[o.status] || o.status}
          </span>
        </div>

        {isLive && !isPendingApproval(o) && (
          <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', padding: '10px 12px', borderRadius: 4, marginBottom: 12 }}>
            <OrderStepper status={o.status} />
          </div>
        )}

        <div style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500, marginBottom: 12 }}>
          {o.items.map((i) => `${i.qty}× ${i.name}`).join(' · ')}
        </div>

        <div className="row between" style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <div>
            <small style={{ display: 'block', fontSize: 11 }}>Total ({o.payment})</small>
            <b className="mono" style={{ fontSize: 17 }}>{inr(o.total)}</b>
          </div>
          <div className="row">
            <button className="btn-ghost sm" onClick={() => reorder(o)}>
              <RotateCcw size={13} /> Reorder
            </button>
            {isLive && (
              <Link className="btn-primary accent sm" to={`/order/${o.id}`}>
                Track Live <ChevronRight size={14} />
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page narrow">
      <Link to="/" className="back"><ArrowLeft size={15} /> Back to Menu</Link>
      <div className="page-head">
        <h1 className="h1" style={{ margin: 0 }}>My Orders</h1>
        <span className="tag">{mine.length} TOTAL</span>
      </div>

      {mine.length === 0 && (
        <div className="empty">
          <span className="empty-code">NO ORDERS</span>
          <div className="empty-icon"><Receipt size={20} /></div>
          <b>No orders placed yet</b>
          <p>Order snacks, meals, or drinks from the menu to lock your pickup slot.</p>
          <Link className="btn-primary accent" to="/">Browse Menu</Link>
        </div>
      )}

      {active.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h2 className="sec" style={{ marginTop: 0 }}>Active <small>{active.length}</small></h2>
          {active.map((o) => <Card key={o.id} o={o} />)}
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="sec">Past Orders <small>{past.length}</small></h2>
          {past.map((o) => <Card key={o.id} o={o} />)}
        </section>
      )}
    </div>
  )
}
