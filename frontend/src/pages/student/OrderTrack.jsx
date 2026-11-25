import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Clock, Timer, AlertCircle, ShoppingBag } from 'lucide-react'
import { useApp } from '../../store/AppContext.jsx'
import { fmtTime, inr, STATUS_LABEL, isActive } from '../../utils/helpers.js'
import OrderStepper from '../../components/OrderStepper.jsx'

const HINT = {
  confirmed: 'Your order is confirmed and queued in the kitchen.',
  preparing: 'Chef is actively cooking and preparing your meal.',
  almost: 'Food is plated and being packaged. Please walk to the counter.',
  ready: 'Your food is READY! Please show your Order ID at the counter.',
  collected: 'Order collected. Enjoy your meal!',
  expired_uncollected: '⚠️ This order was not collected within 30 minutes of pickup time.'
}

export default function OrderTrack() {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const { orders, now } = useApp()
  const o = orders.find((x) => x.id === id)

  if (!o) {
    return (
      <div className="page narrow">
        <div className="empty">
          <div className="empty-emoji">🤷</div>
          <b>Order not found</b>
          <p className="muted">Looking for order {id}...</p>
          <Link className="btn-primary" to="/">Back to menu</Link>
        </div>
      </div>
    )
  }

  const mins = o.slot - now
  const ahead = orders.filter((x) => x.day === 0 && isActive(x) && x.slot <= o.slot && x.id !== o.id).length
  const isUncollectedOverdue = o.status !== 'collected' && now > o.slot + 30

  return (
    <div className="page narrow">
      <Link to="/orders" className="back"><ArrowLeft size={16} /> Back to My Orders</Link>

      {sp.get('new') && (
        <div className="confirm" style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#ecfdf5', color: '#10b981', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <CheckCircle2 size={36} />
          </div>
          <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#0f172a', margin: '0 0 6px 0' }}>Order Placed Successfully!</h2>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Show this Order ID at the counter during your pickup slot</p>
          <div className="oid" style={{ fontSize: '24px', fontWeight: '900', color: '#ea580c', letterSpacing: '1px', marginTop: '6px' }}>{o.id}</div>
        </div>
      )}

      <div className="card track" style={{ padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(0,0,0,0.05)' }}>
        <div className="track-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <small style={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Token / Order</small>
            <h3 style={{ fontSize: '22px', fontWeight: '900', margin: 0, color: '#0f172a' }}>{o.id}</h3>
          </div>
          <span 
            className={`pill st-${o.status}`}
            style={{
              padding: '6px 14px',
              borderRadius: '99px',
              fontWeight: '800',
              fontSize: '13px',
              backgroundColor: isUncollectedOverdue ? '#fef2f2' : (o.status === 'ready' ? '#ecfdf5' : '#fff7ed'),
              color: isUncollectedOverdue ? '#ef4444' : (o.status === 'ready' ? '#059669' : '#ea580c'),
              border: `1px solid ${isUncollectedOverdue ? '#fca5a5' : '#fed7aa'}`
            }}
          >
            {isUncollectedOverdue ? 'Uncollected (Overdue)' : (STATUS_LABEL[o.status] || o.status)}
          </span>
        </div>
        
        {/* Continuous Connected Animated Stepper */}
        <div style={{ margin: '10px 0 20px 0' }}>
          <OrderStepper status={isUncollectedOverdue ? 'ready' : o.status} />
        </div>

        <p className="hint" style={{ fontWeight: '600', color: isUncollectedOverdue ? '#dc2626' : (o.status === 'ready' ? '#10b981' : '#334155'), marginBottom: '20px', fontSize: '14px' }}>
          {isUncollectedOverdue ? HINT.expired_uncollected : (HINT[o.status] || 'Processing your order...')}
        </p>

        {/* PROPERLY SPACED INFO GRID */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '12px',
          backgroundColor: '#f8fafc',
          padding: '16px',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          marginBottom: '20px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12px', marginBottom: '4px' }}>
              <Clock size={14} /> Pickup slot
            </div>
            <b style={{ fontSize: '15px', color: '#0f172a' }}>{fmtTime(o.slot)}</b>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12px', marginBottom: '4px' }}>
              <Timer size={14} /> Estimated wait
            </div>
            <b style={{ fontSize: '15px', color: o.status === 'ready' ? '#10b981' : '#ea580c' }}>
              {o.status === 'ready' || o.status === 'collected' ? 'Ready Now!' : (mins > 0 ? `~${mins} min` : 'Any moment')}
            </b>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12px', marginBottom: '4px' }}>
              <ShoppingBag size={14} /> Orders ahead
            </div>
            <b style={{ fontSize: '15px', color: '#0f172a' }}>
              {o.status === 'ready' || o.status === 'collected' ? '0' : ahead}
            </b>
          </div>
        </div>

        {/* ORDER ITEMS RECEIPT WITH CLEAN PADDING & SPACING */}
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginBottom: '20px' }}>
          {o.items.map((i, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
              <span style={{ color: '#334155' }}>
                <b style={{ color: '#ea580c' }}>{i.qty}×</b> {i.name}
              </span>
              <span style={{ fontWeight: '700', color: '#0f172a' }}>{inr(i.price * i.qty)}</span>
            </div>
          ))}
          {o.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#10b981', fontWeight: '700', marginBottom: '8px' }}>
              <span>Combo savings discount</span>
              <span>−{inr(o.discount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '900', borderTop: '1px dashed #e2e8f0', paddingTop: '10px', marginTop: '6px' }}>
            <span>Total Amount ({o.payment})</span>
            <span style={{ color: '#ea580c' }}>{inr(o.total)}</span>
          </div>
        </div>

        {/* Live sync pulse */}
        <div style={{ padding: '10px', backgroundColor: '#f1f5f9', borderRadius: '10px', fontSize: '12px', color: '#64748b', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
          Status updates live from the kitchen screen
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <Link 
          to="/" 
          className="btn-primary full" 
          style={{ padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold' }}
        >
          Order Something Else
        </Link>
      </div>
    </div>
  )
}
