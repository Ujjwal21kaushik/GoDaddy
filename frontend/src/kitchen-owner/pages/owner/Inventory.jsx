import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { AlertTriangle, Plus } from 'lucide-react'
import { useApp } from '../../../store/AppContext.jsx'
import { inventorySummary } from '../../../utils/analytics.js'

export default function Inventory() {
  const { state, menu, orders, setStock, toast } = useApp()
  const { highlightId } = useLocation().state || {}
  const highlightInputRef = useRef(null)
  const { out, low } = inventorySummary(state)
  const sorted = [...menu].sort((a, b) => a.stock - b.stock)

  useEffect(() => {
    if (highlightId && highlightInputRef.current) {
      highlightInputRef.current.focus()
      highlightInputRef.current.select?.()
      highlightInputRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [highlightId])

  const unitDemand = (itemId) => {
    let booked = 0
    let pending = 0
    orders.forEach((o) => {
      const qty = (o.items || []).filter((x) => x.id === itemId).reduce((s, x) => s + x.qty, 0)
      if (!qty) return
      if (['confirmed', 'preparing', 'almost', 'ready'].includes(o.status)) booked += qty
      else if (['pending_approval', 'counter_offer'].includes(o.status)) pending += qty
    })
    return { booked, pending }
  }

  return (
    <div className="stack">
      <div className="kpis three">
        <div className="card kpi"><small>Items tracked</small><b>{menu.length}</b></div>
        <div className="card kpi amber"><small>Low stock</small><b>{low.length}</b></div>
        <div className="card kpi red"><small>Out of stock</small><b>{out.length}</b></div>
      </div>

      {(out.length > 0 || low.length > 0) && (
        <div className="alerts card pad">
          {out.map((i) => <div key={i.id} className="alert out"><AlertTriangle size={14} /> <b>{i.name}</b> is out of stock — students are requesting it</div>)}
          {low.map((i) => <div key={i.id} className="alert low"><AlertTriangle size={14} /> <b>{i.name}</b> running low ({i.stock} left, alert at {i.low})</div>)}
        </div>
      )}

      <section className="card">
        <div className="card-head">
          <h3>Live Inventory &amp; Stock Control</h3>
          <small className="muted">Set live shelf stock — orders above shelf stock automatically go to Approvals</small>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Status</th>
                <th>On Shelf</th>
                <th>Booked / Pending</th>
                <th>Set Stock</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((i) => {
                const { booked, pending } = unitDemand(i.id)
                const isOut = i.stock === 0
                const isLow = !isOut && i.stock <= i.low
                const cls = isOut ? 'tag red' : isLow ? 'tag amber' : 'tag green'
                const label = isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'
                const isHighlighted = highlightId === i.id

                return (
                  <tr
                    key={i.id}
                    style={isHighlighted ? { background: 'var(--red-soft)', outline: '2px solid var(--red)', outlineOffset: -2 } : undefined}
                  >
                    <td>
                      <span className="t-emoji">{i.emoji}</span> <b>{i.name}</b>
                      <div className="muted mono" style={{ fontSize: 11, marginLeft: 26 }}>
                        {i.prep || 3}m / batch of {i.batchSize || 4}
                      </div>
                    </td>
                    <td><span className={cls}>{label}</span></td>
                    <td><b className="mono">{i.stock} pcs</b></td>
                    <td style={{ fontSize: 12 }}>
                      {booked === 0 && pending === 0 ? (
                        <span className="muted">—</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {booked > 0 && <span><b className="mono">{booked}</b> booked</span>}
                          {pending > 0 && <span style={{ color: 'var(--amber)', fontWeight: 700 }}><span className="mono">{pending}</span> awaiting OK</span>}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="row" style={{ gap: 6 }}>
                        <input
                          ref={isHighlighted ? highlightInputRef : null}
                          className="input mini"
                          type="number"
                          min="0"
                          value={i.stock}
                          aria-label={`Stock for ${i.name}`}
                          onChange={(e) => {
                            const n = Math.max(0, parseInt(e.target.value || '0', 10) || 0)
                            setStock(i.id, n)
                          }}
                        />
                        <button
                          type="button"
                          className="btn-ghost sm"
                          title={`Add 20 units to ${i.name}`}
                          onClick={() => {
                            const next = (Number(i.stock) || 0) + 20
                            setStock(i.id, next)
                            toast(`Added +20 stock to ${i.name} (${next} pcs)`, 'ok')
                          }}
                        >
                          <Plus size={12} /> 20
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
