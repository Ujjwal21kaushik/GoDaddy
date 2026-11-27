import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../../../store/AppContext.jsx'
import { CATEGORIES } from '../../../data/categories.js'
import { inr, isEffAvail } from '../../../utils/helpers.js'
import Modal from '../../../components/Modal.jsx'

const blank = { name: '', cat: 'Snacks', price: '', stock: '', daily: '', desc: '', img: '', emoji: '🍽️', prep: 5, batchSize: 4, veg: true }

function Form({ item, onClose }) {
  const { saveMenuItem, toast, menu } = useApp()
  const [f, setF] = useState(item ? { ...item } : blank)
  const [err, setErr] = useState('')
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const save = () => {
    const price = Number(f.price), stock = Number(f.stock)
    if (!f.name.trim()) return setErr('Name is required')
    if (menu.some((m) => m.id !== f.id && m.name.toLowerCase() === f.name.trim().toLowerCase())) return setErr('An item with this name already exists')
    if (!(price > 0)) return setErr('Enter a price above ₹0')
    if (!Number.isInteger(stock) || stock < 0) return setErr('Stock must be a whole number (0 or more)')

    saveMenuItem({
      ...f,
      id: f.id || 'n' + Date.now().toString(36),
      name: f.name.trim(),
      price,
      stock,
      daily: Number(f.daily) || Math.max(stock, 10),
      low: f.low ?? Math.max(3, Math.round(stock * 0.15)),
      weekUnits: f.weekUnits ?? 0,
      prep: Number(f.prep) || 5,
      batchSize: Math.max(1, Number(f.batchSize) || 4),
      popular: !!f.popular,
      available: stock > 0,
    })
    toast(item ? 'Item updated in database' : 'New item saved to database', 'ok')
    onClose()
  }
  return (
    <Modal title={item ? 'Edit menu item' : 'Add menu item'} onClose={onClose}>
      <div className="form">
        <label>Name<input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} /></label>
        <div className="f-row">
          <label>Category<select className="input" value={f.cat} onChange={(e) => set('cat', e.target.value)}>{CATEGORIES.filter((c) => c.id !== 'all').map((c) => <option key={c.id}>{c.id}</option>)}</select></label>
          <label>Price (₹)<input className="input" type="number" min="1" value={f.price} onChange={(e) => set('price', e.target.value)} /></label>
        </div>
        <div className="f-row">
          <label>Stock today<input className="input" type="number" min="0" value={f.stock} onChange={(e) => set('stock', e.target.value)} /></label>
          <label>Prep time (min)<input className="input" type="number" min="1" value={f.prep} onChange={(e) => set('prep', e.target.value)} /></label>
          <label>Batch size (plates/batch)<input className="input" type="number" min="1" value={f.batchSize ?? 4} onChange={(e) => set('batchSize', e.target.value)} /></label>
        </div>
        <div className="f-row">
          <label>Emoji<input className="input" value={f.emoji} maxLength={4} onChange={(e) => set('emoji', e.target.value)} /></label>
          <label>Type<select className="input" value={f.veg ? 'veg' : 'nv'} onChange={(e) => set('veg', e.target.value === 'veg')}><option value="veg">Veg</option><option value="nv">Non-veg</option></select></label>
        </div>
        <label>Image URL (optional)<input className="input" placeholder="https://…" value={f.img} onChange={(e) => set('img', e.target.value)} /></label>
        <label>Description<input className="input" value={f.desc} onChange={(e) => set('desc', e.target.value)} /></label>
        {err && <div className="err">{err}</div>}
        <div className="row end">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary accent" onClick={save}>Save Item</button>
        </div>
      </div>
    </Modal>
  )
}

export default function MenuManager() {
  const { menu, deleteMenuItem, toast } = useApp()
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(false)
  return (
    <div className="stack">
      <div className="row between">
        <div>
          <h3>Menu Catalog ({menu.length})</h3>
          <p className="muted">Configure pricing, stock levels, and batch cooking sizes</p>
        </div>
        <button className="btn-primary accent" onClick={() => setAdding(true)}><Plus size={14} /> Add New Item</button>
      </div>
      <div className="menu-grid">
        {menu.map((i) => {
          const avail = isEffAvail(i)
          return (
            <div key={i.id} className={`m-item ${avail ? '' : 'dim'}`}>
              <div className="m-thumb">
                <span className="m-emoji">{i.emoji}</span>
                {i.img && <img src={i.img} alt={i.name} />}
              </div>
              <div className="m-info">
                <b>{i.name}</b>
                <div className="m-sub mono">
                  {i.cat} · {inr(i.price)} · {i.stock} pcs · {i.prep}m/{i.batchSize || 4}pc
                </div>
                {i.stock === 0 && <span className="tag red" style={{ marginTop: 4 }}>Sold Out</span>}
              </div>
              <div className="m-acts">
                <button className="icon-btn" onClick={() => setEditing(i)} aria-label="Edit item"><Pencil size={13} /></button>
                <button className="icon-btn danger" onClick={() => { deleteMenuItem(i.id); toast(`Deleted ${i.name}`) }} aria-label="Delete item"><Trash2 size={13} /></button>
              </div>
            </div>
          )
        })}
      </div>
      {(adding || editing) && <Form item={editing} onClose={() => { setAdding(false); setEditing(null) }} />}
    </div>
  )
}
