import { AlertTriangle, Plus } from 'lucide-react'
import { useApp } from '../../store/AppContext.jsx'
import { inventorySummary } from '../../utils/analytics.js'

export default function Inventory() {
  const { state, menu, setStock, toast } = useApp()
  const { out, low } = inventorySummary(state)
  const sorted = [...menu].sort((a, b) => a.stock / (a.daily || 1) - b.stock / (b.daily || 1))

  return (
    <div className="stack">
      <div className="kpis three">
        <div className="card kpi"><small>Items tracked</small><b>{menu.length}</b></div>
        <div className="card kpi amber"><small>Low stock</small><b>{low.length}</b></div>
        <div className="card kpi red"><small>Out of stock</small><b>{out.length}</b></div>
      </div>
      {(out.length > 0 || low.length > 0) && (
        <div className="alerts card pad">
          {out.map((i) => <div key={i.id} className="alert out"><AlertTriangle size={14} /> <b>{i.name}</b> is out of stock — students are asking for it</div>)}
          {low.map((i) => <div key={i.id} className="alert low"><AlertTriangle size={14} /> <b>{i.name}</b> is running low ({i.stock} left, alert at {i.low})</div>)}
        </div>
      )}
      <section className="card">
        <div className="card-head">
          <h3>Live Inventory Overview & Quick Restock</h3>
          <small className="muted">Directly updates backend database</small>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Item</th><th>Level</th><th>Left / Prepared</th><th>Set Stock</th><th>Quick Restock</th></tr></thead>
            <tbody>
              {sorted.map((i) => {
                const pct = Math.min(100, Math.round((i.stock / (i.daily || 1)) * 100))
                const tone = i.stock === 0 ? 'red' : i.stock <= i.low ? 'amber' : 'green'
                return (
                  <tr key={i.id}>
                    <td><span className="t-emoji">{i.emoji}</span> <b>{i.name}</b></td>
                    <td className="lvlcell"><div className={`bar ${tone}`}><i style={{ width: `${pct}%` }} /></div></td>
                    <td><b>{i.stock}</b> / {i.daily}</td>
                    <td>
                      <input 
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
                    </td>
                    <td>
                      <button 
                        className="btn-ghost sm" 
                        style={{ color: '#10b981', borderColor: '#a7f3d0', backgroundColor: '#f0fdf4' }}
                        onClick={() => { 
                          setStock(i.id, i.stock + 20)
                          toast(`+20 ${i.name} restocked to database!`, 'ok')
                        }}
                      >
                        <Plus size={13} /> +20 Refill
                      </button>
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
