import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Clock, Phone, RotateCcw, ShoppingBag, Timer, XCircle } from 'lucide-react'
import { useApp } from '../../store/AppContext.jsx'
import { APPROVAL, fmtTime, getCancelEligibility, inr, isActive, isEffAvail, STATUS_LABEL } from '../../utils/helpers.js'
import OrderStepper from '../../components/OrderStepper.jsx'

const HINT = {
  confirmed: 'Your order is being prepared in the kitchen.',
  preparing: 'Your order is being prepared in the kitchen.',
  almost: 'Your order is being prepared in the kitchen.',
  ready: 'READY FOR PICKUP — show your Order ID at the counter.',
  delivered: 'Order delivered. Enjoy your meal.',
  collected: 'Order delivered. Enjoy your meal.',
  cancelled: 'This order has been cancelled.',
  expired_uncollected: 'This order was not collected within 30 minutes of the pickup slot.'
}

export default function OrderTrack() {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const { studentOrders, now, menu, dispatch, toast, setCartOpen, respondToOffer, requestCancel, user } = useApp()
  const [tick, setTick] = useState(Date.now())
  const [cancelPhone, setCancelPhone] = useState('')
  const [cancelling, setCancelling] = useState(false)
  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const userKey = user?.username?.toLowerCase()
  const o = studentOrders.find((x) => x.id === id && (!x.usernameKey || (userKey && x.usernameKey === userKey)))

  if (!o) {
    return (
      <div className="page narrow">
        <div className="empty">
          <span className="empty-code">NOT FOUND</span>
          <div className="empty-icon"><ShoppingBag size={20} /></div>
          <b>Order {id} not found</b>
          <p>It may have been cleared or doesn't exist in this session.</p>
          <Link className="btn-primary accent" to="/">Browse again</Link>
        </div>
      </div>
    )
  }

  const reorderAvailable = () => {
    let added = 0
    dispatch({ type: 'CART_CLEAR' })
    o.items.forEach((i) => {
      const m = menu.find((x) => x.id === i.id)
      if (isEffAvail(m)) {
        const capQty = Math.min(i.qty, m.stock)
        if (capQty > 0) {
          dispatch({ type: 'CART_SET', id: m.id, qty: capQty })
          added++
        }
      }
    })
    toast(added ? 'Loaded available stock into your bag' : 'Items are currently out of stock', added ? 'ok' : 'warn')
    nav('/')
    setCartOpen(true)
  }

  if (['pending_approval', 'counter_offer', 'rejected', 'expired', 'cancel_requested'].includes(o.status)) {
    const isCancelWait = o.status === 'cancel_requested'
    const deadline = isCancelWait
      ? (o.cancelDeadline || ((o.cancelRequestedAt || o.createdAt) + APPROVAL.waitMin * 60000))
      : (o.approvalDeadline || (o.createdAt + APPROVAL.waitMin * 60000))
    const left = Math.max(0, deadline - tick)
    const mm = String(Math.floor(left / 60000)).padStart(2, '0')
    const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0')
    const late = ['pending_approval', 'cancel_requested'].includes(o.status) && left === 0

    const title = {
      pending_approval: late ? 'Manager is busy — please call' : 'Waiting for manager approval',
      cancel_requested: late ? 'Manager is busy — please call' : 'Waiting for cancellation approval',
      counter_offer: 'Manager suggested a new pickup time',
      rejected: 'Order declined',
      expired: 'Request expired'
    }[o.status]

    const text = {
      pending_approval: late
        ? `No reply within ${APPROVAL.waitMin} minutes. Call the canteen directly to confirm.`
        : 'This pre-order (above current shelf stock or scheduled > 1 hr ahead) needs manager confirmation. Please wait — this page updates live.',
      cancel_requested: late
        ? `No reply on your cancellation request within ${APPROVAL.waitMin} minutes. Please call the canteen to confirm.`
        : 'Your cancellation request has been sent to the canteen manager. Please wait for their confirmation (or call directly).',
      counter_offer: `The canteen can't do ${fmtTime(o.slot)}, but can serve your order at ${fmtTime(o.proposedSlot)}. Do you accept?`,
      rejected: 'Sorry, the canteen could not fulfill this requested quantity. Reorder using the available shelf stock or pick another slot.',
      expired: 'The manager did not respond in time. Call the canteen or place your order again.'
    }[o.status]

    const tone = o.status === 'rejected' || o.status === 'expired' ? 'red' : 'amber'

    return (
      <div className="page narrow">
        <Link to="/orders" className="back"><ArrowLeft size={15} /> Back to My Orders</Link>
        <div className="card track-card">
          <div className="row between" style={{ marginBottom: 14 }}>
            <div>
              <small style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {isCancelWait ? 'Cancellation Request' : 'Pre-Order Request'}
              </small>
              <h2 className="mono" style={{ fontSize: 22, marginTop: 2 }}>{o.id}</h2>
            </div>
            <span className={`pill st-${o.status}`}>{STATUS_LABEL[o.status] || o.status}</span>
          </div>

          <div className={`notice ${tone}`} style={{ marginBottom: 16 }}>
            <b style={{ display: 'block', fontSize: 15, marginBottom: 4 }}>{title}</b>
            <p style={{ fontSize: 13 }}>{text}</p>
            {['pending_approval', 'cancel_requested'].includes(o.status) && !late && (
              <div className="mono" style={{ marginTop: 10, fontSize: 28, fontWeight: 700, color: 'var(--ink)' }}>
                {mm}:{ss}
              </div>
            )}
          </div>

          {o.status === 'counter_offer' && (
            <div className="row" style={{ marginBottom: 14 }}>
              <button className="btn-primary accent grow" onClick={() => respondToOffer(o.id, true)}>
                Accept {fmtTime(o.proposedSlot)}
              </button>
              <button className="btn-ghost grow" onClick={() => respondToOffer(o.id, false)}>
                Decline
              </button>
            </div>
          )}

          {o.status === 'rejected' && (
            <button className="btn-primary accent full" style={{ marginBottom: 14 }} onClick={reorderAvailable}>
              <RotateCcw size={15} /> Reorder with available stock
            </button>
          )}

          {(late || ['expired', 'pending_approval', 'cancel_requested'].includes(o.status)) && (
            <a
              className={late || o.status === 'expired' ? 'btn-primary accent full' : 'btn-ghost full'}
              href={`tel:${APPROVAL.phone}`}
              style={{ marginBottom: 10 }}
            >
              <Phone size={15} /> Call Canteen · <span className="mono">{APPROVAL.phone}</span>
            </a>
          )}

          {['pending_approval', 'counter_offer'].includes(o.status) && (
            <button
              className="btn-ghost full"
              disabled={cancelling}
              style={{ color: 'var(--red)', borderColor: 'var(--red-border)', marginBottom: 14 }}
              onClick={async () => {
                setCancelling(true)
                await requestCancel(o.id)
                setCancelling(false)
              }}
            >
              <XCircle size={15} /> Cancel Request
            </button>
          )}

          <div className="receipt">
            {o.items.map((i, idx) => (
              <div key={idx} className="receipt-row">
                <span><b className="mono" style={{ color: 'var(--accent)' }}>{i.qty}×</b> {i.name}</span>
                <b className="mono">{inr(i.price * i.qty)}</b>
              </div>
            ))}
            <div className="receipt-total">
              <span>Total · Pickup <span className="mono">{fmtTime(o.slot)}</span></span>
              <span className="mono" style={{ color: 'var(--accent)' }}>{inr(o.total)}</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <Link to="/" className="btn-primary full lg">Back to Menu</Link>
        </div>
      </div>
    )
  }

  const mins = o.slot - now
  const ahead = orders.filter((x) => x.day === 0 && isActive(x) && x.slot <= o.slot && x.id !== o.id).length
  const isUncollectedOverdue = !['delivered', 'collected', 'cancelled'].includes(o.status) && now > o.slot + 30
  const cancelInfo = getCancelEligibility(o, now, menu)

  const submitCancel = async () => {
    const phoneToUse = o.phone || user?.phone || cancelPhone.trim()
    if (!/^\d{10}$/.test(phoneToUse)) {
      toast('Enter a 10-digit phone number so the manager can contact you', 'warn')
      return
    }
    setCancelling(true)
    await requestCancel(o.id, phoneToUse)
    setCancelling(false)
  }

  return (
    <div className="page narrow">
      <Link to="/orders" className="back"><ArrowLeft size={15} /> Back to My Orders</Link>

      {sp.get('new') && (
        <div className="card" style={{ textAlign: 'center', marginBottom: 16, background: 'var(--ink)', color: '#FFFFFF', borderColor: 'var(--ink)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--lime)', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
            <CheckCircle2 size={15} /> ORDER LOCKED IN
          </div>
          <h2 style={{ fontSize: 24, color: '#FFFFFF' }}>Order Placed Successfully</h2>
          <p style={{ color: '#A1A1AA', fontSize: 13, marginTop: 4 }}>Show this ID at the counter during your pickup slot</p>
          <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: 'var(--lime)', marginTop: 8 }}>{o.id}</div>
        </div>
      )}

      <div className="card track-card">
        <div className="row between" style={{ marginBottom: 16 }}>
          <div>
            <small style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>Token / Order</small>
            <h3 className="mono" style={{ fontSize: 22, marginTop: 2 }}>{o.id}</h3>
          </div>
          <span className={`pill st-${isUncollectedOverdue ? 'cancelled' : o.status}`}>
            {isUncollectedOverdue ? 'Overdue' : (STATUS_LABEL[o.status] || o.status)}
          </span>
        </div>

        {o.status !== 'cancelled' && (
          <div style={{ marginBottom: 18 }}>
            <OrderStepper status={isUncollectedOverdue ? 'ready' : o.status} />
          </div>
        )}

        <div
          className={`notice ${isUncollectedOverdue || o.status === 'cancelled' ? 'red' : ['ready', 'delivered', 'collected'].includes(o.status) ? 'green' : ''}`}
          style={{ marginBottom: 16, fontWeight: 600 }}
        >
          {isUncollectedOverdue ? HINT.expired_uncollected : (HINT[o.status] || 'Preparing your order…')}
        </div>

        <div className="info-grid">
          <div>
            <small><Clock size={12} /> Pickup Slot</small>
            <b>{fmtTime(o.slot)}</b>
          </div>
          <div>
            <small><Timer size={12} /> Est. Wait</small>
            <b style={{ color: ['ready', 'delivered', 'collected'].includes(o.status) ? 'var(--green)' : 'var(--accent)' }}>
              {['delivered', 'collected'].includes(o.status) ? 'Delivered' : o.status === 'ready' ? 'Ready Now' : (mins > 0 ? `~${mins} min` : 'Any moment')}
            </b>
          </div>
          <div>
            <small><ShoppingBag size={12} /> Orders Ahead</small>
            <b>{['ready', 'delivered', 'collected'].includes(o.status) ? '0' : ahead}</b>
          </div>
        </div>

        <div className="receipt">
          {o.items.map((i, idx) => (
            <div key={idx} className="receipt-row">
              <span><b className="mono" style={{ color: 'var(--accent)' }}>{i.qty}×</b> {i.name}</span>
              <span className="mono" style={{ fontWeight: 700 }}>{inr(i.price * i.qty)}</span>
            </div>
          ))}
          {o.discount > 0 && (
            <div className="receipt-row" style={{ color: 'var(--green)', fontWeight: 600 }}>
              <span>Combo savings</span>
              <span className="mono">−{inr(o.discount)}</span>
            </div>
          )}
          <div className="receipt-total">
            <span>Total ({o.payment})</span>
            <span className="mono" style={{ color: 'var(--accent)' }}>{inr(o.total)}</span>
          </div>
        </div>

        {['preparing', 'confirmed'].includes(o.status) && (
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14, marginBottom: 14 }}>
            {o.cancelRejected && (
              <div className="notice amber" style={{ marginBottom: 10, fontSize: 12 }}>
                Your previous cancellation request was declined by the manager — this order remains active.
              </div>
            )}
            {cancelInfo.allowed ? (
              <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 4, padding: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 8 }}>
                  <b>Need to cancel?</b> Batch prep needs <span className="mono">~{cancelInfo.cook}m</span>, so requests stay open until <b className="mono">{fmtTime(cancelInfo.cutoffSlot)}</b>.
                </div>
                {!(o.phone || user?.phone) && (
                  <input
                    className="input"
                    style={{ marginBottom: 8 }}
                    placeholder="Phone number (10 digits) — manager will confirm"
                    value={cancelPhone}
                    inputMode="numeric"
                    maxLength={10}
                    onChange={(e) => setCancelPhone(e.target.value.replace(/\D/g, ''))}
                  />
                )}
                <div className="row">
                  <button
                    className="btn-ghost sm grow"
                    disabled={cancelling}
                    style={{ color: 'var(--red)', borderColor: 'var(--red-border)' }}
                    onClick={submitCancel}
                  >
                    <XCircle size={14} /> {cancelling ? 'Sending…' : 'Request Cancellation'}
                  </button>
                  <a className="btn-ghost sm grow" href={`tel:${APPROVAL.phone}`}>
                    <Phone size={14} /> Call · <span className="mono">{APPROVAL.phone}</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="row between" style={{ fontSize: 12, color: 'var(--mute)' }}>
                <span>Cancellation closed: {cancelInfo.reason}.</span>
                <a href={`tel:${APPROVAL.phone}`} className="link">Call · {APPROVAL.phone}</a>
              </div>
            )}
          </div>
        )}

        <div className="sync-bar">
          <span className="sync-dot" />
          Live status syncs automatically with the kitchen display
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <Link to="/" className="btn-primary full lg">Order Something Else</Link>
      </div>
    </div>
  )
}
