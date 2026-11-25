import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Clock, CheckCircle2, ChevronRight, PackageCheck, AlertCircle } from 'lucide-react'
import { useApp } from '../../store/AppContext.jsx'
import { fmtTime, inr, isActive, isEffAvail, STATUS_LABEL } from '../../utils/helpers.js'
import OrderStepper from '../../components/OrderStepper.jsx'

export default function MyOrders() {
  const { orders, menu, dispatch, toast, setCartOpen } = useApp()
  const nav = useNavigate()
  const mine = orders.filter((o) => o.mine).sort((a, b) => b.createdAt - a.createdAt)
  const active = mine.filter(isActive).concat(mine.filter((o) => o.status === 'ready'))
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
    toast(skipped ? `Added ${added}, ${skipped} unavailable now` : 'Items added to cart', skipped ? 'warn' : 'ok')
    nav('/')
    setCartOpen(true)
  }

  const Card = ({ o }) => {
    const isLive = o.status !== 'collected' && o.status !== 'cancelled'
    const statusBg = o.status === 'ready' 
      ? '#ecfdf5' 
      : (o.status === 'preparing' || o.status === 'almost' ? '#fffbeb' : '#eff6ff')
    const statusColor = o.status === 'ready' 
      ? '#059669' 
      : (o.status === 'preparing' || o.status === 'almost' ? '#d97706' : '#2563eb')

    return (
      <div 
        className="card order-card"
        style={{
          border: isLive ? '1.5px solid #fed7aa' : '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
          backgroundColor: '#ffffff'
        }}
      >
        <div className="oc-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <b style={{ fontSize: '18px', color: '#0f172a' }}>{o.id}</b>
              {isLive && (
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
              )}
            </div>
            <small style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <Clock size={12} /> {o.day === 0 ? 'Today' : 'Yesterday'} · Pickup Slot: <b>{fmtTime(o.slot)}</b>
            </small>
          </div>
          <span 
            style={{
              backgroundColor: statusBg,
              color: statusColor,
              fontWeight: '800',
              fontSize: '12px',
              padding: '4px 12px',
              borderRadius: '99px',
              border: `1px solid ${statusColor}33`
            }}
          >
            {STATUS_LABEL[o.status] || o.status}
          </span>
        </div>

        {/* Live Order Progress Stepper Coverage */}
        {isLive && (
          <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '12px', marginBottom: '14px' }}>
            <OrderStepper status={o.status} />
          </div>
        )}

        <div className="oc-items" style={{ fontSize: '14px', color: '#334155', fontWeight: '500', marginBottom: '14px' }}>
          {o.items.map((i) => `${i.qty}× ${i.name}`).join(' • ')}
        </div>

        <div className="oc-foot" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
          <div>
            <small style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Total Amount ({o.payment})</small>
            <b style={{ fontSize: '18px', color: '#0f172a' }}>{inr(o.total)}</b>
          </div>
          <div className="row" style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-ghost sm" onClick={() => reorder(o)}>
              <RotateCcw size={13} /> Reorder
            </button>
            {isLive && (
              <Link 
                className="btn-primary sm" 
                to={`/order/${o.id}`}
                style={{ backgroundColor: '#ea580c', color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
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
      <Link to="/" className="back"><ArrowLeft size={16} /> Back to Menu</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 className="h1" style={{ margin: 0 }}>My Orders & Coverage</h1>
        <span style={{ fontSize: '12px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '4px 10px', borderRadius: '99px', fontWeight: 'bold' }}>
          {mine.length} Total Placed
        </span>
      </div>

      {mine.length === 0 && (
        <div className="empty">
          <div className="empty-emoji">🧾</div>
          <b>No orders placed yet</b>
          <p>Order fresh snacks from the canteen menu to start tracking.</p>
          <Link className="btn-primary" to="/">Explore Food Menu</Link>
        </div>
      )}

      {active.length > 0 && (
        <section style={{ marginBottom: '28px' }}>
          <h2 className="sec" style={{ marginTop: 0 }}>
            <span>Active Orders</span>
            <small>{active.length}</small>
          </h2>
          {active.map((o) => <Card key={o.id} o={o} />)}
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="sec">
            <span>Past Orders</span>
            <small>{past.length}</small>
          </h2>
          {past.map((o) => <Card key={o.id} o={o} />)}
        </section>
      )}
    </div>
  )
}
