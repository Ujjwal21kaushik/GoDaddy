import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Clock, ShoppingBag, Tag, Timer, X } from 'lucide-react'
import { useApp } from '../../store/AppContext.jsx'
import { COMBO } from '../../data/mock.js'
import { cartSummary, fmtTime, inr, isActive, isEffAvail, leadTime, nextBoundary, SLOT_LABEL } from '../../utils/helpers.js'
import Qty from '../Qty.jsx'
import SlotPicker from './SlotPicker.jsx'
import { CLOSE } from '../../utils/helpers.js'

export default function CartDrawer() {
  const { state, cartOpen, setCartOpen, setQty, dispatch, placeOrder, now, slot: slotInfo, orders, setAltItem, toast } = useApp()
  const nav = useNavigate()
  const sum = useMemo(() => cartSummary(state.cart, state.menu, COMBO), [state.cart, state.menu])
  const lead = leadTime(sum.prep || 3, orders)
  const slots = useMemo(() => {
    const out = []
    for (let m = nextBoundary(now); m < CLOSE; m += 15) out.push(slotInfo(m))
    return out
  }, [now, orders, state.caps])

  const recommended = slots.find((s) => s.slot >= now + lead && s.state !== 'full')?.slot ?? null

  const [chosen, setChosen] = useState(null)
  const [name, setName] = useState(state.profile.name || 'Ujjwal')
  const [payment, setPayment] = useState('UPI')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  // keep the selection valid; auto-pick the recommended slot
  useEffect(() => {
    const cur = slots.find((s) => s.slot === chosen)
    if (!cur || cur.state === 'full' || cur.slot < now + lead) {
      setChosen(recommended || (slots[0]?.slot ?? null))
    }
  }, [recommended, chosen, slots, now, lead])

  const sel = slots.find((s) => s.slot === chosen)
  const ahead = chosen == null ? 0 : orders.filter((o) => o.day === 0 && isActive(o) && o.slot <= chosen).length
  const waitMin = chosen == null ? 0 : Math.max(chosen - now, lead)

  if (!cartOpen) return null
  const unavailable = sum.lines.filter((l) => !isEffAvail(l.item) || l.qty > l.item.stock)

  const submit = () => {
    if (busy) return
    setErr('')
    setBusy(true)

    // Ensure slot is picked
    const slotToBook = chosen || recommended || slots[0]?.slot
    if (!slotToBook) {
      setErr('Please select a pickup slot')
      setBusy(false)
      return
    }

    const r = placeOrder({ name: name || 'Student', slot: slotToBook, payment })
    if (!r.ok) {
      setErr(r.error)
      setBusy(false)
      return
    }

    setCartOpen(false)
    setBusy(false)
    toast('Order placed successfully!', 'ok')
    
    // Instant Navigation to Order Track / Status Page!
    nav(`/order/${r.order.id}?new=1`)
  }

  return (
    <div className="drawer-back" onMouseDown={(e) => e.target === e.currentTarget && setCartOpen(false)}>
      <aside className="drawer">
        <div className="drawer-head">
          <h3><ShoppingBag size={18} /> Your cart</h3>
          <button className="icon-btn" onClick={() => setCartOpen(false)} aria-label="Close cart"><X size={18} /></button>
        </div>

        {sum.lines.length === 0 ? (
          <div className="empty">
            <div className="empty-emoji">🛍️</div>
            <b>Your cart is empty</b>
            <p>Add something tasty and grab a pickup slot.</p>
            <button className="btn-primary" onClick={() => setCartOpen(false)}>Browse food</button>
          </div>
        ) : (
          <div className="drawer-body">
            <div className="eta-banner"><Timer size={16} /> Pickup in 15 — your order is ready at your slot, no queue.</div>

            <section className="cart-lines">
              {sum.lines.map((l) => {
                const bad = !isEffAvail(l.item) || l.qty > l.item.stock
                return (
                  <div key={l.item.id} className={`cart-line ${bad ? 'bad' : ''}`}>
                    <span className="cl-emoji">{l.item.emoji}</span>
                    <div className="grow">
                      <b>{l.item.name}</b>
                      <small>{bad ? (isEffAvail(l.item) ? `Only ${l.item.stock} left` : 'Just sold out') : inr(l.item.price)}</small>
                    </div>
                    {bad && !isEffAvail(l.item) ? (
                      <button className="btn-alt" onClick={() => setAltItem(l.item)}>Alternatives</button>
                    ) : (
                      <Qty size="sm" value={l.qty} onChange={(v) => setQty(l.item, v)} />
                    )}
                    <b className="cl-price">{inr(l.item.price * l.qty)}</b>
                  </div>
                )
              })}
              {unavailable.length > 0 && (
                <button className="btn-ghost full" onClick={() => unavailable.forEach((l) => dispatch({ type: 'CART_SET', id: l.item.id, qty: isEffAvail(l.item) ? l.item.stock : 0 }))}>
                  <AlertTriangle size={14} /> Fix unavailable items
                </button>
              )}
            </section>

            <section>
              <h4>Pickup slot <small>every 15 minutes</small></h4>
              <SlotPicker slots={slots} selected={chosen} onSelect={setChosen} recommended={recommended} now={now} lead={lead} />
              {slots.length === 0 && <p className="muted">The canteen is closed for today.</p>}
              {sel && (
                <div className="eta-card">
                  <div><Clock size={14} /> Pickup time <b>{fmtTime(sel.slot)}</b></div>
                  <div><Timer size={14} /> Estimated wait <b>~{waitMin} min</b></div>
                  <div className="muted">{ahead} order{ahead === 1 ? '' : 's'} ahead of you · slot {SLOT_LABEL[sel.state].toLowerCase()} ({sel.left} left)</div>
                </div>
              )}
            </section>

            <section>
              <h4>Your details</h4>
              <input className="input" placeholder="Name or roll number" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
              <div className="pay">
                {['UPI', 'Pay at counter'].map((p) => (
                  <label key={p} className={payment === p ? 'on' : ''}>
                    <input type="radio" name="pay" checked={payment === p} onChange={() => setPayment(p)} /> {p}
                  </label>
                ))}
              </div>
            </section>

            <section className="bill">
              <div><span>Items ({sum.units})</span><span>{inr(sum.subtotal)}</span></div>
              {sum.discount > 0 && <div className="save"><span><Tag size={13} /> Combo of the Day ×{sum.comboSets}</span><span>−{inr(sum.discount)}</span></div>}
              <div><span>Pickup</span><span>FREE</span></div>
              <div className="grand"><span>To pay</span><span>{inr(sum.total)}</span></div>
            </section>
          </div>
        )}

        {sum.lines.length > 0 && (
          <div className="drawer-foot">
            {err && <div className="err">{err}</div>}
            <button className="btn-primary full lg" disabled={busy || sum.hasUnavailable} onClick={submit}>
              {busy ? 'Placing…' : `Pay ${inr(sum.total)} · Pick up at ${fmtTime(chosen || recommended || slots[0]?.slot || 720)}`}
            </button>
          </div>
        )}
      </aside>
    </div>
  )
}
