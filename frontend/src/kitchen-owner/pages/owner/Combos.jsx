import { useMemo, useState } from 'react'
import { Check, Pause, Pencil, Play, Plus, Search, Sparkles, Trash2, X } from 'lucide-react'
import { useApp } from '../../../store/AppContext.jsx'
import { inr, isEffAvail } from '../../../utils/helpers.js'
import Modal from '../../../components/Modal.jsx'
import Qty from '../../../components/Qty.jsx'

function ComboForm({ combo, onClose }) {
  const { menu, saveCombo, toast } = useApp()
  const [name, setName] = useState(combo?.name || '')
  const [tagline, setTagline] = useState(combo?.tagline || '')
  const [price, setPrice] = useState(combo?.price != null ? String(combo.price) : '')
  const [active, setActive] = useState(combo ? combo.active !== false : true)
  const [selected, setSelected] = useState(() => {
    const map = {}
    ;(combo?.items || []).forEach((ci) => {
      if (ci?.id) map[ci.id] = Math.max(1, Number(ci.qty) || 1)
    })
    return map
  })
  const [q, setQ] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const selectedList = useMemo(() => {
    return Object.entries(selected)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({ id, qty, item: menu.find((m) => m.id === id) }))
      .filter((x) => x.item)
  }, [selected, menu])

  const originalTotal = useMemo(
    () => selectedList.reduce((s, x) => s + x.item.price * x.qty, 0),
    [selectedList]
  )
  const numericPrice = Number(price)
  const savings = originalTotal > 0 && numericPrice > 0 ? originalTotal - numericPrice : 0

  const filteredMenu = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return menu
    return menu.filter((m) => `${m.name} ${m.cat}`.toLowerCase().includes(term))
  }, [menu, q])

  const setItemQty = (id, nextQty) => {
    setSelected((prev) => {
      const next = { ...prev }
      if (nextQty <= 0) delete next[id]
      else next[id] = Math.min(20, nextQty)
      return next
    })
  }

  const submit = async () => {
    if (!name.trim()) return setErr('Combo name is required.')
    if (selectedList.length === 0) return setErr('Add at least one menu item to this combo.')
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) return setErr('Enter a valid combo price above ₹0.')

    const autoTagline = selectedList
      .map((x) => `${x.qty > 1 ? `${x.qty}× ` : ''}${x.item.name}`)
      .join(' + ')

    setErr('')
    setSaving(true)
    const res = await saveCombo({
      id: combo?.id || `combo-${Date.now().toString(36)}`,
      name: name.trim(),
      tagline: tagline.trim() || autoTagline,
      items: selectedList.map((x) => ({ id: x.id, qty: x.qty })),
      price: numericPrice,
      active,
      createdAt: combo?.createdAt || Date.now(),
    })
    setSaving(false)

    if (!res.ok) return setErr(res.error || 'Could not save combo')
    toast(combo ? 'Combo deal updated' : 'New combo deal published')
    onClose()
  }

  return (
    <Modal title={combo ? 'Edit Combo Deal' : 'Create Combo Deal'} wide onClose={onClose}>
      <div className="form">
        <div className="f-row">
          <label>
            Combo Name
            <input
              className="input"
              placeholder="e.g. Evening Chai & Snacks"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Combo Price (₹)
            <input
              className="input"
              type="number"
              min="1"
              placeholder={originalTotal > 0 ? String(Math.max(1, originalTotal - 15)) : '69'}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>
        </div>

        <label>
          Tagline / Subtitle (optional — auto-fills from items if left blank)
          <input
            className="input"
            placeholder="e.g. Chole Kulche + Patties Aloo + Masala Tea"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
          />
        </label>

        {/* SELECTED ITEMS & PRICING PREVIEW */}
        <div style={{ border: '1px solid var(--border, #E4E4E7)', borderRadius: 6, padding: 12, background: '#FAFAF8' }}>
          <div className="row between" style={{ marginBottom: 8 }}>
            <b style={{ fontSize: 13 }}>Selected Items ({selectedList.length})</b>
            <div className="mono" style={{ fontSize: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span>Items Value: <b>{inr(originalTotal)}</b></span>
              <span>Combo: <b>{numericPrice > 0 ? inr(numericPrice) : '—'}</b></span>
              {savings > 0 ? (
                <span style={{ color: '#059669', fontWeight: 700 }}>Saves {inr(savings)}</span>
              ) : numericPrice > 0 && originalTotal > 0 && savings <= 0 ? (
                <span style={{ color: '#D97706', fontWeight: 700 }}>Price &ge; item sum</span>
              ) : null}
            </div>
          </div>

          {selectedList.length === 0 ? (
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>Pick items from the menu list below to build this combo.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {selectedList.map((x) => (
                <span
                  key={x.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 8px',
                    borderRadius: 4,
                    background: '#FFFFFF',
                    border: '1px solid #D4D4D8',
                    fontSize: 12,
                  }}
                >
                  <span>{x.item.emoji}</span>
                  <b>{x.qty}&times; {x.item.name}</b>
                  <span className="muted mono">{inr(x.item.price * x.qty)}</span>
                  <button
                    type="button"
                    onClick={() => setItemQty(x.id, 0)}
                    aria-label={`Remove ${x.item.name}`}
                    style={{ border: 0, background: 'none', cursor: 'pointer', padding: 2, display: 'inline-flex', color: '#71717A' }}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* SEARCHABLE MENU ITEM PICKER */}
        <div>
          <div className="row between" style={{ marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Pick Menu Items</span>
            <div style={{ position: 'relative', width: 220 }}>
              <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#71717A' }} />
              <input
                className="input"
                style={{ paddingLeft: 28, height: 32, fontSize: 12 }}
                placeholder="Search menu…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>

          <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #E4E4E7', borderRadius: 6, background: '#FFFFFF' }}>
            {filteredMenu.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: '#71717A' }}>No menu items matched &ldquo;{q}&rdquo;.</div>
            ) : (
              filteredMenu.map((m) => {
                const qty = selected[m.id] || 0
                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderBottom: '1px solid #F4F4F5',
                      gap: 10,
                      background: qty > 0 ? '#FEF2F2' : '#FFFFFF',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <span style={{ fontSize: 18 }}>{m.emoji}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
                        <div className="mono muted" style={{ fontSize: 11 }}>
                          {m.cat} &middot; {inr(m.price)} &middot; {m.stock} in stock
                        </div>
                      </div>
                    </div>
                    {qty > 0 ? (
                      <Qty value={qty} onChange={(v) => setItemQty(m.id, v)} size="sm" />
                    ) : (
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => setItemQty(m.id, 1)}
                      >
                        <Plus size={12} /> Add
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          <span>Show this combo live on Student page immediately</span>
        </label>

        {err && <div className="err">{err}</div>}
        <div className="row end">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary accent" onClick={submit} disabled={saving}>
            <Check size={14} /> {saving ? 'Saving…' : (combo ? 'Save Combo' : 'Publish Combo')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default function Combos() {
  const { combos, menu, saveCombo, deleteCombo, toast } = useApp()
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(false)

  const activeCount = combos.filter((c) => c.active !== false).length
  const pausedCount = combos.length - activeCount

  const toggleActive = async (c) => {
    const next = c.active === false
    const res = await saveCombo({ ...c, active: next })
    if (res.ok) toast(next ? `${c.name} is now live for students` : `${c.name} paused`)
  }

  return (
    <div className="stack">
      <div className="row between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3>Combo Deals ({combos.length})</h3>
          <p className="muted">
            Create bundled meals with automatic discount pricing — live deals appear on the Student page.
          </p>
        </div>
        <button className="btn-primary accent" onClick={() => setAdding(true)}>
          <Plus size={14} /> Create Combo
        </button>
      </div>

      {combos.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span className="tag green">{activeCount} Live on Student Page</span>
          {pausedCount > 0 && <span className="tag">{pausedCount} Paused</span>}
        </div>
      )}

      {combos.length === 0 ? (
        <div className="empty">
          <span className="empty-code">NO COMBOS</span>
          <div className="empty-icon"><Sparkles size={20} /></div>
          <b>No combo deals created yet</b>
          <p>Bundle popular canteen items like Tea + Patties or Maggi + Cold Coffee to boost order value.</p>
          <button className="btn-primary accent" onClick={() => setAdding(true)}>
            <Plus size={14} /> Create First Combo
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))' }}>
          {combos.map((c) => {
            const cItems = (c.items || [])
              .map((ci) => ({ ...ci, item: menu.find((m) => m.id === ci.id) }))
              .filter((ci) => ci.item)
            const original = cItems.reduce((s, ci) => s + ci.item.price * (ci.qty || 1), 0)
            const savings = Math.max(0, original - Number(c.price || 0))
            const isLive = c.active !== false
            const allInStock = cItems.length === (c.items || []).length && cItems.every((ci) => isEffAvail(ci.item))

            return (
              <div
                key={c.id}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E4E4E7',
                  borderRadius: 8,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  opacity: isLive ? 1 : 0.72,
                }}
              >
                <div className="row between" style={{ alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span className={`tag ${isLive ? 'green' : ''}`}>{isLive ? 'LIVE' : 'PAUSED'}</span>
                    {!allInStock && <span className="tag red">ITEM SOLD OUT</span>}
                    {savings > 0 && <span className="tag" style={{ background: '#09090B', color: '#D4FF00' }}>SAVE {inr(savings)}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="icon-btn"
                      title={isLive ? 'Pause combo' : 'Activate combo'}
                      onClick={() => toggleActive(c)}
                      aria-label={isLive ? 'Pause combo' : 'Activate combo'}
                    >
                      {isLive ? <Pause size={13} /> : <Play size={13} />}
                    </button>
                    <button className="icon-btn" onClick={() => setEditing(c)} aria-label="Edit combo">
                      <Pencil size={13} />
                    </button>
                    <button
                      className="icon-btn danger"
                      onClick={() => { deleteCombo(c.id); toast(`Deleted ${c.name}`) }}
                      aria-label="Delete combo"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: 16 }}>{c.name}</h4>
                  <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                    {c.tagline || cItems.map((ci) => `${ci.qty > 1 ? `${ci.qty}× ` : ''}${ci.item.name}`).join(' + ')}
                  </p>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {cItems.map((ci) => (
                    <span
                      key={ci.item.id}
                      style={{
                        fontSize: 12,
                        padding: '3px 8px',
                        borderRadius: 4,
                        background: '#F4F4F0',
                        border: '1px solid #E4E4E7',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <span>{ci.item.emoji}</span>
                      <span>{ci.qty > 1 ? `${ci.qty}× ` : ''}{ci.item.name}</span>
                      <span className="muted mono">{inr(ci.item.price)}</span>
                    </span>
                  ))}
                </div>

                <div className="row between" style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid #F4F4F5' }}>
                  <div className="combo-price" style={{ margin: 0 }}>
                    <b>{inr(c.price)}</b>
                    {original > c.price && <s>{inr(original)}</s>}
                  </div>
                  <span className="mono muted" style={{ fontSize: 11 }}>{cItems.length} item{cItems.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {(adding || editing) && (
        <ComboForm
          combo={editing}
          onClose={() => { setAdding(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
