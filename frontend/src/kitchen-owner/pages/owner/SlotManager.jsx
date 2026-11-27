import { Ban, Clock, Minus, Plus, ShieldAlert, UserX } from 'lucide-react'
import { useApp } from '../../../store/AppContext.jsx'
import { allSlots, fmtTime, SLOT_LABEL } from '../../../utils/helpers.js'

const OPEN_OPTIONS = []
for (let m = 6 * 60; m <= 22 * 60; m += 30) OPEN_OPTIONS.push(m)

const CLOSE_OPTIONS = []
for (let m = 7 * 60; m <= 27 * 60; m += 30) CLOSE_OPTIONS.push(m) // up to 3:00 AM next day

const fmtOption = (m) => (m >= 1440 ? `${fmtTime(m)} (Next day)` : fmtTime(m))

export default function SlotManager() {
  const { state, dispatch, slot: info, now, toast, orders, hours, setHours, setCapDefault, setCapSlot } = useApp()
  const { def, overrides } = state.caps
  const rows = allSlots(hours.open, hours.close).map(info)

  const uncollectedOrders = orders.filter((o) => {
    return !['delivered', 'collected', 'cancelled', 'rejected', 'expired', 'pending_approval', 'counter_offer', 'cancel_requested'].includes(o.status) && (now > o.slot + 30)
  })

  const cancelAndBlacklist = (order) => {
    dispatch({ type: 'STATUS', id: order.id, status: 'cancelled' })
    toast(`Order ${order.id} cancelled and flagged for pickup violation`, 'warn')
  }

  const onOpenChange = (newOpen) => {
    const newClose = hours.close <= newOpen + 30 ? Math.min(27 * 60, newOpen + 60) : hours.close
    setHours(newOpen, newClose)
    toast(`Canteen hours set to ${fmtTime(newOpen)} – ${fmtOption(newClose)}`, 'ok')
  }

  const onCloseChange = (newClose) => {
    setHours(hours.open, newClose)
    toast(`Canteen hours set to ${fmtTime(hours.open)} – ${fmtOption(newClose)}`, 'ok')
  }

  return (
    <div className="stack">
      {uncollectedOrders.length > 0 && (
        <section className="card" style={{ borderColor: 'var(--red)', background: 'var(--red-soft)' }}>
          <div className="row" style={{ marginBottom: 12 }}>
            <ShieldAlert size={20} color="#E11D48" />
            <div>
              <h3 style={{ color: '#9F1239', fontSize: 15 }}>
                Uncollected Overdue Orders ({uncollectedOrders.length}) — Food Waste Alert
              </h3>
              <small style={{ color: '#9F1239' }}>Ready &gt;30 min past pickup slot and uncollected.</small>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {uncollectedOrders.map((o) => (
              <div key={o.id} className="slot-row" style={{ borderColor: 'var(--red-border)' }}>
                <div>
                  <div className="row">
                    <b className="mono">{o.id}</b>
                    <span className="tag red">Overdue {now - o.slot}m</span>
                  </div>
                  <small>Student: <b>{o.name || 'Student'}</b> · Slot <b className="mono">{fmtTime(o.slot)}</b> · {(o.items || []).map((i) => `${i.qty}× ${i.name}`).join(', ')}</small>
                </div>
                <button className="btn-danger" onClick={() => cancelAndBlacklist(o)}>
                  <UserX size={14} /> Blacklist &amp; Restock
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* DYNAMIC CANTEEN OPERATING HOURS */}
      <section className="card">
        <div className="card-head">
          <div className="row">
            <Clock size={16} color="#FF3B1D" />
            <div>
              <h3 style={{ margin: 0 }}>Canteen Operating Hours</h3>
              <small className="muted">Change opening &amp; closing time anytime (supports late-night events past midnight)</small>
            </div>
          </div>
          <span className="tag">{rows.length} ACTIVE SLOTS</span>
        </div>

        <div className="f-row">
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>
            Opens At
            <select className="input mono" value={hours.open} onChange={(e) => onOpenChange(Number(e.target.value))}>
              {OPEN_OPTIONS.map((m) => <option key={m} value={m}>{fmtTime(m)}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>
            Closes At
            <select className="input mono" value={hours.close} onChange={(e) => onCloseChange(Number(e.target.value))}>
              {CLOSE_OPTIONS.filter((m) => m >= hours.open + 60).map((m) => (
                <option key={m} value={m}>{fmtOption(m)}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* GLOBAL SLOT CAPACITY */}
      <section className="card">
        <div className="row between">
          <div>
            <h3>Global Slot Capacity</h3>
            <small className="muted">Applies to every 15-minute window without a custom override</small>
          </div>
          <div className="row" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', padding: '4px 8px', borderRadius: 4 }}>
            <button className="icon-btn" aria-label="Decrease" onClick={() => setCapDefault(def - 1)}><Minus size={13} /></button>
            <b className="mono" style={{ fontSize: 17, minWidth: 30, textAlign: 'center' }}>{def}</b>
            <button className="icon-btn" aria-label="Increase" onClick={() => setCapDefault(def + 1)}><Plus size={13} /></button>
          </div>
        </div>
      </section>

      {/* DYNAMIC 15-MIN SLOT SCHEDULE */}
      <section className="card">
        <div className="card-head">
          <h3>15-Minute Slot Schedule ({fmtTime(hours.open)} – {fmtOption(hours.close)})</h3>
          <small className="mono">{Object.keys(overrides).length} OVERRIDES</small>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rows.map((s) => {
            const past = s.slot + 15 <= now
            const custom = overrides[s.slot] != null
            const barColor = s.cap === 0 ? '#E11D48' : s.pct > 75 ? '#D97706' : '#059669'

            return (
              <div key={s.slot} className={`slot-row ${past ? 'past' : ''}`}>
                <b className="mono" style={{ minWidth: 96, fontSize: 13 }}>
                  {fmtTime(s.slot)}{s.slot >= 1440 ? ' (+1d)' : ''}
                </b>
                <div className="grow" style={{ minWidth: 100 }}>
                  <div className="bar" style={{ marginTop: 0 }}>
                    <i style={{ width: `${s.pct}%`, background: barColor }} />
                  </div>
                </div>
                <div className="mono" style={{ minWidth: 132, textAlign: 'right', fontSize: 12, fontWeight: 700, color: s.cap === 0 ? 'var(--red)' : 'var(--ink-2)' }}>
                  {s.used} / {s.cap} · {s.cap === 0 ? 'CLOSED' : SLOT_LABEL[s.state].toUpperCase()}
                </div>
                <div className="row" style={{ gap: 4 }}>
                  <button className="icon-btn" aria-label="Less" disabled={past} onClick={() => setCapSlot(s.slot, Math.max(0, s.cap - 1))}><Minus size={12} /></button>
                  <b className="mono" style={{ minWidth: 24, textAlign: 'center', fontSize: 13, color: custom ? 'var(--accent)' : 'var(--ink)' }}>{s.cap}</b>
                  <button className="icon-btn" aria-label="More" disabled={past} onClick={() => setCapSlot(s.slot, s.cap + 1)}><Plus size={12} /></button>
                  <button className="icon-btn danger" title="Close this slot" disabled={past} onClick={() => setCapSlot(s.slot, 0)}><Ban size={12} /></button>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
