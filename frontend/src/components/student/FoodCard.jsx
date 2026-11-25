import { Clock, Plus } from 'lucide-react'
import { useApp } from '../../store/AppContext.jsx'
import { inr, isEffAvail } from '../../utils/helpers.js'
import Qty from '../Qty.jsx'

export default function FoodCard({ item, compact }) {
  const { cart, setQty, setAltItem } = useApp()
  const q = cart[item.id] || 0
  const sold = !isEffAvail(item)
  return (
    <div className={`food-card ${sold ? 'sold' : ''} ${compact ? 'compact' : ''}`}>
      <div className="food-img">
        <span className="food-emoji">{item.emoji}</span>
        {item.img && <img src={item.img} alt={item.name} loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none' }} />}
        {sold && <div className="sold-badge">Sold out</div>}
        {!sold && item.stock <= item.low && <span className="low-tag">Only {item.stock} left</span>}
      </div>
      <div className="food-body">
        <div className="food-title"><i className={`veg ${item.veg ? '' : 'nv'}`} /> {item.name}</div>
        <div className="food-desc">{item.desc}</div>
        <div className="food-meta"><Clock size={12} /> {item.prep} min</div>
        <div className="food-foot">
          <b className="price">{inr(item.price)}</b>
          {sold ? (
            <button className="btn-alt" onClick={() => setAltItem(item)}>Find alternative</button>
          ) : q === 0 ? (
            <button className="btn-add" onClick={() => setQty(item, 1)}>ADD <Plus size={13} strokeWidth={3} /></button>
          ) : (
            <Qty value={q} onChange={(v) => setQty(item, v)} />
          )}
        </div>
      </div>
    </div>
  )
}
