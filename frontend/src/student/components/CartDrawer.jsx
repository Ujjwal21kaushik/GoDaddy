import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Clock, ShoppingBag, Tag, Timer, X } from 'lucide-react'
import { useApp } from '../../store/AppContext.jsx'
import { APPROVAL, cartSummary, CLOSE, cookMinutes, earliestSlot, fmtTime, inr, isActive, isEffAvail, isPreOrder, leadTime, needsApproval, nextBoundary, SLOT_LABEL } from '../../utils/helpers.js'
import Qty from '../../components/Qty.jsx'
import SlotPicker from './SlotPicker.jsx'

export default function CartDrawer() {
  const { state, combos, cartOpen, setCartOpen, setQty, dispatch, placeOrder, now, slot: slotInfo, slotCounts, activeBySlot, activeUnits, setAltItem, toast, hours, user } = useApp()
  const nav = useNavigate()
  const [chosen, setChosen] = useState(null)
  const pre = chosen != null && isPreOrder(chosen, now)
  const sum = useMemo(() => cartSummary(state.cart, state.menu, combos, pre), [state.cart, state.menu, combos, pre])
  const cartItems = sum.lines.map((l) => ({ id: l.item.id, qty: l.qty }))
  const cook = cookMinutes(cartItems, state.menu)
  const lead = Math.max(leadTime(sum.prep || 3, activeUnits), cook)
  const slots = useMemo(() => {
    const out = []
    const start = Math.max(nextBoundary(now), hours.open)
    for (let m = start; m < hours.close; m += 15) out.push(slotInfo(m))
    return out
  }, [now, slotCounts, state.caps, hours.open, hours.close])

  const recommended = slots.find((s) => s.slot >= now + lead && s.state !== 'full')?.slot ?? null

  const [payment, setPayment] = useState('UPI')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    const cur = slots.find((s) => s.slot === chosen)
    if (!cur || cur.state === 'full' || cur.slot < now + lead) {
      setChosen(recommended || (slots[0]?.slot ?? null))
    }
  }, [recommended, chosen, slots, now, lead])

  const sel = slots.find((s) => s.slot === chosen)
  const ahead = chosen == null ? 0 : Number(activeBySlot?.[chosen] || 0)
  const waitMin = chosen == null ? 0 : Math.max(chosen - now, lead)

  if (!cartOpen) return null
  const requiresApproval = needsApproval(cartItems, chosen, now, state.menu)
  const hasOverStock = sum.lines.some((l) => l.qty > l.item.stock)
  const unavailable = sum.lines.filter((l) => !isEffAvail(l.item))

  const submit = async () => {
    if (busy) return
    setErr('')
    setBusy(true)

    const slotToBook = chosen || recommended || slots[0]?.slot
    if (!slotToBook) {
      setErr('Please select a pickup slot')
      setBusy(false)
      return
    }

    const r = await placeOrder({ slot: slotToBook, payment })
    if (!r.ok) {
      setErr(r.error)
      setBusy(false)
      if (r.conflictItemId && r.availableStock === 0) {
        const conflictItem = state.menu.find((m) => m.id === r.conflictItemId)
        if (conflictItem) setAltItem({ ...conflictItem, stock: 0, available: false })
      }
      return
    }

    setCartOpen(false)
    setBusy(false)
    toast(r.order.status === 'pending_approval' ? 'Request sent — waiting for manager approval' : 'Order placed — now preparing!', r.order.status === 'pending_approval' ? 'warn' : 'ok')
    nav(`/order/${r.order.id}?new=1`)
  }

  return (
    <div className="drawer-back" onMouseDown={(e) => e.target === e.currentTarget && setCartOpen(false)}>
      <aside className="drawer">
        <div className="drawer-head">
          <h3><ShoppingBag size={17} /> Your Bag</h3>
          <button className="icon-btn" onClick={() => setCartOpen(false)} aria-label="Close bag"><X size={16} /></button>
        </div>

        {sum.lines.length === 0 ? (
          <div style={{ padding: 20, margin: 'auto 0' }}>
            <div className="empty">
              <span className="empty-code">BAG EMPTY</span>
              <div className="empty-icon"><ShoppingBag size={20} /></div>
              <b>Your bag is empty</b>
              <p>Add food from the menu and lock a 15-minute pickup window.</p>
              <button className="btn-primary accent" onClick={() => setCartOpen(false)}>Browse menu</button>
            </div>
          </div>
        ) : (
          <div className="drawer-body">
            <div className="eta-banner">
              <Timer size={15} /> Zero-queue pickup — collect hot food at your chosen slot.
            </div>

            <section className="cart-lines">
              {sum.lines.map((l) => {
                const bad = !isEffAvail(l.item)
                const overStock = isEffAvail(l.item) && l.qty > l.item.stock
                return (
                  <div key={l.item.id} className={`cart-line ${bad ? 'bad' : ''}`}>
                    <span className="cl-emoji">{l.item.emoji}</span>
                    <div className="grow">
                      <b style={{ display: 'block', fontSize: 13 }}>{l.item.name}</b>
                      <small style={overStock ? { color: '#D97706', fontWeight: 600 } : undefined}>
                        {bad
                          ? 'Just sold out'
                          : overStock
                            ? (pre ? `Pre-order (${l.item.stock} on shelf — cooked fresh)` : `Only ${l.item.stock} on shelf — manager approval required`)
                            : inr(l.item.price)}
                      </small>
                    </div>
                    {bad ? (
                      <button className="btn-alt" onClick={() => setAltItem(l.item)}>Alternatives</button>
                    ) : (
                      <Qty size="sm" value={l.qty} onChange={(v) => setQty(l.item, v)} />
                    )}
                    <b className="cl-price">{inr(l.item.price * l.qty)}</b>
                  </div>
                )
              })}
              {unavailable.length > 0 && (
                <button
                  className="btn-ghost full sm"
                  onClick={() => unavailable.forEach((l) => dispatch({ type: 'CART_SET', id: l.item.id, qty: isEffAvail(l.item) ? l.item.stock : 0 }))}
                >
                  <AlertTriangle size={14} /> Remove sold-out items
                </button>
              )}
            </section>

            <section>
              <h4>Pickup Slot <small className="mono">15-MIN WINDOWS</small></h4>
              <SlotPicker slots={slots} selected={chosen} onSelect={setChosen} recommended={recommended} now={now} lead={lead} />
              {slots.length === 0 && <p className="muted" style={{ marginTop: 8 }}>The canteen is closed for today.</p>}
              {sel && (
                <div className="eta-card">
                  <div><Clock size={13} /> Pickup time <b className="mono">{fmtTime(sel.slot)}</b></div>
                  <div><Timer size={13} /> Estimated wait <b className="mono">~{waitMin} min</b></div>
                  <div className="muted">{ahead} order{ahead === 1 ? '' : 's'} ahead · {SLOT_LABEL[sel.state].toLowerCase()} ({sel.left} spots left)</div>
                  <div className="muted">Estimated batch prep: <b className="mono">~{cook} min</b> · earliest ready <span className="mono">{fmtTime(earliestSlot(now, cook))}</span></div>
                  {(pre || hasOverStock) && (
                    <div className="notice violet" style={{ marginTop: 4, padding: '8px 10px', fontSize: 12, fontWeight: 700 }}>
                      PRE-ORDER — {hasOverStock && pre
                        ? 'above current shelf stock & pickup is more than 1 hour away'
                        : hasOverStock
                          ? 'requested quantity exceeds current shelf stock'
                          : 'pickup is more than 1 hour away (shelf stock stays protected)'}
                    </div>
                  )}
                </div>
              )}
            </section>

            <section>
              <h4>Ordering As</h4>
              <div className="eta-card" style={{ marginTop: 0 }}>
                <div className="row between" style={{ width: '100%' }}>
                  <span>Student</span>
                  <b>{user?.username} <small className="mono">({user?.rollNo})</small></b>
                </div>
                <div className="row between" style={{ width: '100%' }}>
                  <span>Phone</span>
                  <b className="mono">{user?.phone}</b>
                </div>
              </div>
              {requiresApproval && (
                <div className="notice amber" style={{ marginTop: 8, fontSize: 12 }}>
                  This is a pre-order ({hasOverStock && pre ? 'above shelf stock & > 1 hr ahead' : hasOverStock ? 'requested quantity exceeds shelf stock' : 'pickup is more than 1 hour away'}), so the canteen manager must confirm it first using your saved number (<span className="mono">{user?.phone}</span>). Expect a reply within {APPROVAL.waitMin} minutes.
                </div>
              )}
              <div className="pay">
                {['UPI', 'Pay at counter'].map((p) => (
                  <label key={p} className={payment === p ? 'on' : ''}>
                    <input type="radio" name="pay" style={{ display: 'none' }} checked={payment === p} onChange={() => setPayment(p)} /> {p}
                  </label>
                ))}
              </div>
            </section>

            <section className="bill">
              <div><span>Items ({sum.units})</span><span className="mono">{inr(sum.subtotal)}</span></div>
              {sum.discount > 0 && <div className="save"><span><Tag size={12} /> Combo Discount ×{sum.comboSets}</span><span className="mono">−{inr(sum.discount)}</span></div>}
              <div><span>Counter Pickup</span><span className="mono">FREE</span></div>
              <div className="grand"><span>Total</span><span>{inr(sum.total)}</span></div>
            </section>
          </div>
        )}

        {sum.lines.length > 0 && (
          <div className="drawer-foot">
            {err && <div className="err">{err}</div>}
            <button className={`btn-primary full lg ${requiresApproval ? '' : 'accent'}`} disabled={busy || sum.hasUnavailable} onClick={submit}>
              {busy
                ? 'Placing…'
                : requiresApproval
                  ? `Request Pre-Order Approval · ${fmtTime(chosen || recommended || slots[0]?.slot || 720)}`
                  : `Pay ${inr(sum.total)} · Pick up ${fmtTime(chosen || recommended || slots[0]?.slot || 720)}`}
            </button>
          </div>
        )}
      </aside>
    </div>
  )
}
