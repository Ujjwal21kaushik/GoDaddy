import { useEffect, useState } from 'react'
import { BellRing, CalendarClock, Check, CheckCircle2, Clock, Phone, User, X } from 'lucide-react'
import { useApp } from '../../../store/AppContext.jsx'
import { APPROVAL, allSlots, fmtTime, inr } from '../../../utils/helpers.js'

function Request({ o }) {
  const { decideOrder, decideCancel, now, slot: slotInfo, menu, orders, hours } = useApp()
  const [counterSlot, setCounterSlot] = useState(o.suggestedSlot ? String(o.suggestedSlot) : '')
  const [busy, setBusy] = useState(false)
  const isCancelReq = o.status === 'cancel_requested'
  const refTs = isCancelReq ? (o.cancelRequestedAt || o.createdAt) : o.createdAt
  const age = Math.floor((Date.now() - refTs) / 60000)
  const overdue = ['pending_approval', 'cancel_requested'].includes(o.status) && age >= APPROVAL.waitMin
  const options = allSlots(hours.open, hours.close).filter((s) => s > now && s !== o.slot && slotInfo(s).state !== 'full')

  const booked = (o.items || []).map((i) => {
    const units = orders
      .filter((x) => x.id !== o.id && x.slot === o.slot && ['confirmed', 'preparing', 'almost', 'ready'].includes(x.status))
      .reduce((s, x) => s + (x.items || []).filter((y) => y.id === i.id).reduce((a, y) => a + y.qty, 0), 0)
    const m = menu.find((x) => x.id === i.id)
    const stock = m?.stock ?? 0
    return { name: i.name, qty: i.qty, units, stock, over: m && i.qty > stock }
  })
  const hasOverStock = booked.some((b) => b.over)

  const act = async (action, slot) => {
    setBusy(true)
    await decideOrder(o.id, action, slot)
    setBusy(false)
  }

  const actCancel = async (action) => {
    setBusy(true)
    await decideCancel(o.id, action)
    setBusy(false)
  }

  return (
    <div className="card" style={{ marginBottom: 14, borderColor: isCancelReq || overdue ? 'var(--red)' : 'var(--ink)' }}>
      <div className="row between" style={{ alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div className="row">
            <b className="mono" style={{ fontSize: 17 }}>{o.id}</b>
            {isCancelReq && <span className="tag red">Cancellation Request</span>}
            {o.isPreOrder && <span className="tag violet">Pre-Order</span>}
            {o.status === 'expired' && <span className="tag red">Expired</span>}
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            <Clock size={12} style={{ verticalAlign: 'text-bottom' }} /> Requested {age === 0 ? 'just now' : `${age}m ago`} · Pickup <b className="mono">{fmtTime(o.slot)}</b>
            {o.cookMinutes > 0 && <span> · Est. batch prep <b className="mono">~{o.cookMinutes}m</b></span>}
          </div>
        </div>
        {overdue && (
          <span className="tag red"><BellRing size={12} /> Overdue ({age}m)</span>
        )}
      </div>

      <div className="row" style={{ gap: 18, marginBottom: 12, fontSize: 13 }}>
        <span className="row"><User size={14} /> <b>{o.name}</b></span>
        <span className="row">
          <Phone size={14} /> {o.phone ? <a href={`tel:${o.phone}`} className="mono"><b>{o.phone}</b></a> : <span className="muted">No phone</span>}
        </span>
      </div>

      {!isCancelReq && hasOverStock && (
        <div className="notice amber" style={{ marginBottom: 12, fontSize: 12, fontWeight: 600 }}>
          Exceeds shelf stock — approve if you can make extra, or reject so the student reorders available stock.
        </div>
      )}

      {isCancelReq && (
        <div className="notice red" style={{ marginBottom: 12, fontSize: 12, fontWeight: 600 }}>
          {o.stockDeducted
            ? 'Approving cancels this order and restores shelf stock automatically.'
            : 'Approving cancels this cook-ahead pre-order.'}
        </div>
      )}

      <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 4, padding: 12, marginBottom: 14 }}>
        {o.items.map((i, idx) => (
          <div key={idx} className="row between" style={{ fontSize: 13, marginBottom: 4 }}>
            <span><b className="mono" style={{ color: 'var(--accent)' }}>{i.qty}×</b> {i.name} <small className="mono">@ {inr(i.price)}</small></span>
            <b className="mono">{inr(i.price * i.qty)}</b>
          </div>
        ))}
        <div className="row between" style={{ fontWeight: 700, borderTop: '1px dashed var(--line-strong)', paddingTop: 8, marginTop: 6 }}>
          <span>Total ({o.payment})</span>
          <span className="mono" style={{ color: 'var(--accent)', fontSize: 15 }}>{inr(o.total)}</span>
        </div>
        <div className="muted" style={{ fontSize: 11, marginTop: 8, fontFamily: 'var(--font-mono)' }}>
          {booked.map((b) => `${b.name}: ${b.units} booked in slot · ${b.stock} on shelf`).join(' | ')}
        </div>
      </div>

      {isCancelReq ? (
        <div className="row">
          <button className="btn-danger" disabled={busy} onClick={() => actCancel('approve')}>
            <Check size={14} /> Approve Cancellation
          </button>
          <button className="btn-ghost sm" disabled={busy} onClick={() => actCancel('reject')}>
            <X size={14} /> Reject Cancellation (Keep Order)
          </button>
        </div>
      ) : o.status === 'counter_offer' ? (
        <div className="notice violet" style={{ fontSize: 12, fontWeight: 600 }}>
          Offered <span className="mono">{fmtTime(o.proposedSlot)}</span> — waiting for student response.
        </div>
      ) : (
        <div className="row">
          <button className="btn-primary sm" disabled={busy} onClick={() => act('approve')}><Check size={14} /> Approve</button>
          <button className="btn-ghost sm" disabled={busy} style={{ color: 'var(--red)', borderColor: 'var(--red-border)' }} onClick={() => act('reject')}><X size={14} /> Reject</button>
          <div className="row" style={{ gap: 6 }}>
            <select className="input" style={{ width: 'auto', padding: '7px 10px' }} value={counterSlot} onChange={(e) => setCounterSlot(e.target.value)}>
              <option value="">Suggest another time…</option>
              {options.map((s) => <option key={s} value={s}>{fmtTime(s)}</option>)}
            </select>
            <button className="btn-ghost sm" disabled={busy || !counterSlot} onClick={() => act('counter', Number(counterSlot))}>
              <CalendarClock size={14} /> Send
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Approvals() {
  const { orders } = useApp()
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30000)
    return () => clearInterval(t)
  }, [])
  const list = orders
    .filter((o) => ['pending_approval', 'counter_offer', 'cancel_requested'].includes(o.status) || (o.status === 'expired' && o.requiresApproval))
    .sort((a, b) => b.createdAt - a.createdAt)

  return (
    <div className="stack">
      <div>
        <h2 style={{ marginBottom: 4 }}>Pre-Order &amp; Cancellation Approvals</h2>
        <p className="muted">
          Pre-orders (exceeding shelf stock or pickup &gt; 1 hour ahead) and student cancellation requests appear here. Stock is only updated after you approve.
        </p>
      </div>
      {list.length === 0 ? (
        <div className="empty">
          <span className="empty-code">INBOX ZERO</span>
          <div className="empty-icon"><CheckCircle2 size={20} /></div>
          <b>No requests waiting</b>
          <p>Incoming pre-orders and cancellation requests will show up here in real time.</p>
        </div>
      ) : list.map((o) => <Request key={o.id} o={o} />)}
    </div>
  )
}
