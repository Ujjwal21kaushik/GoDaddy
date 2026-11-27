import { useMemo, useState } from 'react'
import { Lightbulb } from 'lucide-react'
import { useApp } from '../../store/AppContext.jsx'
import { inr, isEffAvail } from '../../utils/helpers.js'
import Modal from '../../components/Modal.jsx'
import Qty from '../../components/Qty.jsx'

// Every sold-out attempt lands here: we record the missed demand, and if the student
// picks an alternative the demand is flagged as "recovered" in Demand Intelligence.
export default function AlternativeModal() {
  const { altItem: item, setAltItem, menu, dispatch, logMissed, toast, cart } = useApp()
  const [qty, setQty] = useState(1)
  const alts = useMemo(() => {
    const ok = menu.filter((m) => m.id !== item.id && isEffAvail(m))
    const same = ok.filter((m) => m.cat === item.cat).sort((a, b) => b.weekUnits - a.weekUnits)
    const rest = ok.filter((m) => m.cat !== item.cat).sort((a, b) => Math.abs(a.price - item.price) - Math.abs(b.price - item.price))
    return [...same, ...rest].slice(0, 4)
  }, [menu, item])

  const close = () => { logMissed({ item, qty }); setAltItem(null) }
  const choose = (alt) => {
    const n = Math.min(qty, alt.stock)
    logMissed({ item, qty, alt })
    dispatch({ type: 'CART_SET', id: alt.id, qty: Math.min((cart[alt.id] || 0) + n, alt.stock) })
    toast(`Added ${alt.name} instead`)
    setAltItem(null)
  }

  return (
    <Modal title={`${item.name} is sold out`} onClose={close}>
      <p className="muted">We'll notify the canteen of your request so they restock faster. How many did you want?</p>
      <div className="alt-qty">
        <small style={{ fontWeight: 700, textTransform: 'uppercase' }}>Quantity</small>
        <Qty value={qty} onChange={(v) => setQty(Math.max(1, Math.min(v, 10)))} />
      </div>
      <div className="alt-title"><Lightbulb size={14} /> Try one of these instead</div>
      <div className="alt-list">
        {alts.map((a) => (
          <div key={a.id} className="alt-row">
            <span className="alt-emoji">{a.emoji}</span>
            <div className="grow">
              <b style={{ display: 'block', fontSize: 13 }}>{a.name}</b>
              <small className="mono">{inr(a.price)} · {a.prep}m{a.cat === item.cat ? ' · same category' : ''}</small>
            </div>
            <button className="btn-add sm" onClick={() => choose(a)}>ADD</button>
          </div>
        ))}
      </div>
      <button className="btn-ghost full" onClick={close}>No thanks, just notify canteen</button>
    </Modal>
  )
}
