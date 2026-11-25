import { Ban, Minus, Plus, RotateCcw, AlertTriangle, ShieldAlert, UserX, Clock } from 'lucide-react'
import { useApp } from '../../store/AppContext.jsx'
import { allSlots, fmtTime, SLOT_LABEL } from '../../utils/helpers.js'

export default function SlotManager() {
  const { state, dispatch, slot: info, now, toast, orders } = useApp()
  const { def, overrides } = state.caps
  const rows = allSlots().map(info)

  // Identify orders that were scheduled >30 minutes ago but never picked up!
  const uncollectedOrders = orders.filter((o) => {
    return o.status !== 'collected' && o.status !== 'cancelled' && (now > o.slot + 30)
  })

  const rush = () => {
    for (let m = 12 * 60; m < 14 * 60; m += 15) dispatch({ type: 'CAP_SLOT', slot: m, cap: def + 2 })
    toast('Rush hours (12–2 PM) set to +2 capacity', 'ok')
  }

  const cancelAndBlacklist = (order) => {
    dispatch({ type: 'STATUS', id: order.id, status: 'cancelled' })
    toast(`Order ${order.id} cancelled. User marked for canteen pickup violation alert!`, 'warn')
  }

  return (
    <div className="stack">
      {/* UNCOLLECTED ORDERS & BLACKLIST SECTION */}
      {uncollectedOrders.length > 0 && (
        <section className="card" style={{ border: '2px solid #ef4444', backgroundColor: '#fef2f2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, color: '#991b1b', fontSize: '17px' }}>
                Uncollected Overdue Orders ({uncollectedOrders.length}) — Food Waste & Violation Alert
              </h3>
              <small style={{ color: '#b91c1c' }}>
                These orders were ready more than 30 mins past slot pickup time and student never showed up.
              </small>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {uncollectedOrders.map((o) => (
              <div 
                key={o.id} 
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid #fecaca'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <b style={{ color: '#0f172a', fontSize: '15px' }}>{o.id}</b>
                    <span style={{ fontSize: '11px', backgroundColor: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '99px', fontWeight: 'bold' }}>
                      Overdue by {now - o.slot} mins
                    </span>
                  </div>
                  <small style={{ color: '#64748b', display: 'block', marginTop: '2px' }}>
                    Student: <b>{o.name || 'Anonymous'}</b> · Slot was {fmtTime(o.slot)} · Items: {(o.items || []).map(i => `${i.qty}x ${i.name}`).join(', ')}
                  </small>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => cancelAndBlacklist(o)}
                    style={{
                      padding: '8px 14px',
                      backgroundColor: '#dc2626',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <UserX size={14} /> Blacklist & Restock Item
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* DEFAULT CAPACITY CONTROL */}
      <section className="card" style={{ padding: '24px', borderRadius: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#0f172a' }}>Global Slot Capacity</h3>
            <small style={{ color: '#64748b' }}>Applies to every 15-minute slot without a custom override</small>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#f1f5f9', padding: '6px 14px', borderRadius: '12px' }}>
            <button 
              className="icon-btn" 
              aria-label="Decrease" 
              onClick={() => dispatch({ type: 'CAP_DEFAULT', n: def - 1 })}
              style={{ width: '30px', height: '30px', borderRadius: '8px', backgroundColor: '#fff' }}
            >
              <Minus size={14} />
            </button>
            <b style={{ fontSize: '18px', minWidth: '32px', textAlign: 'center', color: '#0f172a' }}>{def}</b>
            <button 
              className="icon-btn" 
              aria-label="Increase" 
              onClick={() => dispatch({ type: 'CAP_DEFAULT', n: def + 1 })}
              style={{ width: '30px', height: '30px', borderRadius: '8px', backgroundColor: '#fff' }}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn-ghost sm" onClick={rush} style={{ backgroundColor: '#fff7ed', borderColor: '#fed7aa', color: '#ea580c' }}>
            ⚡ Boost 12:00 – 2:00 PM Peak (+2 Cap)
          </button>
          <button className="btn-ghost sm" onClick={() => dispatch({ type: 'CAP_ALL', n: def })}>
            <RotateCcw size={14} /> Reset Custom Overrides
          </button>
        </div>
      </section>

      {/* ALL SLOTS TODAY WITH CLEAN FLEX ALIGNMENT */}
      <section className="card" style={{ padding: '24px', borderRadius: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px' }}>All 15-Minute Slots Today (10:00 AM – 5:00 PM)</h3>
            <small style={{ color: '#64748b' }}>{Object.keys(overrides).length} custom capacity overrides configured</small>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {rows.map((s) => {
            const past = s.slot + 15 <= now
            const custom = overrides[s.slot] != null

            return (
              <div 
                key={s.slot} 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 18px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: past ? '#f8fafc' : '#ffffff',
                  opacity: past ? 0.6 : 1,
                  gap: '16px'
                }}
              >
                {/* Time */}
                <div style={{ minWidth: '110px' }}>
                  <b style={{ fontSize: '14px', color: '#0f172a' }}>{fmtTime(s.slot)}</b>
                </div>

                {/* Progress bar */}
                <div style={{ flex: 1, minWidth: '120px' }}>
                  <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${s.pct}%`,
                      backgroundColor: s.cap === 0 ? '#ef4444' : (s.pct > 75 ? '#f59e0b' : '#10b981')
                    }} />
                  </div>
                </div>

                {/* Capacity text */}
                <div style={{ minWidth: '130px', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: s.cap === 0 ? '#ef4444' : '#475569' }}>
                  {s.used} / {s.cap} · {s.cap === 0 ? 'Closed' : SLOT_LABEL[s.state]}
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button 
                    className="icon-btn" 
                    aria-label="Less" 
                    disabled={past} 
                    onClick={() => dispatch({ type: 'CAP_SLOT', slot: s.slot, cap: Math.max(0, s.cap - 1) })}
                    style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#f1f5f9' }}
                  >
                    <Minus size={12} />
                  </button>
                  <b style={{ minWidth: '24px', textAlign: 'center', fontSize: '13px', color: custom ? '#ea580c' : '#0f172a' }}>
                    {s.cap}
                  </b>
                  <button 
                    className="icon-btn" 
                    aria-label="More" 
                    disabled={past} 
                    onClick={() => dispatch({ type: 'CAP_SLOT', slot: s.slot, cap: s.cap + 1 })}
                    style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#f1f5f9' }}
                  >
                    <Plus size={12} />
                  </button>
                  <button 
                    className="icon-btn" 
                    title="Close this slot" 
                    disabled={past} 
                    onClick={() => dispatch({ type: 'CAP_SLOT', slot: s.slot, cap: 0 })}
                    style={{ width: '28px', height: '28px', borderRadius: '6px', color: '#ef4444' }}
                  >
                    <Ban size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
