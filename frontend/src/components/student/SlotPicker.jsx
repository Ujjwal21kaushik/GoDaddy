import { Sparkles, Clock, CheckCircle2 } from 'lucide-react'
import { fmtTime, SLOT_LABEL } from '../../utils/helpers.js'

export default function SlotPicker({ slots, selected, onSelect, recommended, now, lead }) {
  return (
    <div style={{ marginTop: '8px' }}>
      {recommended != null && selected !== recommended && (
        <button 
          className="reco" 
          onClick={() => onSelect(recommended)}
          style={{
            width: '100%',
            backgroundColor: '#fff7ed',
            border: '1.5px dashed #ea580c',
            borderRadius: '12px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            color: '#9a3412',
            fontSize: '12px',
            fontWeight: 'bold',
            marginBottom: '12px',
            cursor: 'pointer'
          }}
        >
          <Sparkles size={14} color="#ea580c" /> 
          <span>Fastest Slot: <b>{fmtTime(recommended)}</b> — Tap to auto-select</span>
        </button>
      )}

      {/* Modern High-Conversion Slot Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(115px, 1fr))',
        gap: '10px',
        maxHeight: '220px',
        overflowY: 'auto',
        padding: '2px',
        paddingRight: '6px'
      }}>
        {slots.map((s) => {
          const tooSoon = s.slot < now + lead
          const isFull = s.state === 'full'
          const off = isFull || tooSoon
          const isSelected = selected === s.slot

          return (
            <button
              key={s.slot}
              disabled={off}
              onClick={() => onSelect(s.slot)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                padding: '10px 8px',
                borderRadius: '12px',
                border: isSelected ? '2px solid #ea580c' : (off ? '1px solid #f1f5f9' : '1.5px solid #e2e8f0'),
                backgroundColor: isSelected ? '#fff7ed' : (off ? '#f8fafc' : '#ffffff'),
                cursor: off ? 'not-allowed' : 'pointer',
                textAlign: 'center',
                boxShadow: isSelected ? '0 4px 12px rgba(234,88,12,0.18)' : '0 1px 3px rgba(0,0,0,0.04)',
                opacity: off ? 0.5 : 1,
                position: 'relative',
                transition: 'all 0.15s ease'
              }}
            >
              {isSelected && (
                <span style={{ position: 'absolute', top: '-6px', right: '-6px', backgroundColor: '#ea580c', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={12} />
                </span>
              )}
              <span style={{ fontSize: '13px', fontWeight: '800', color: isSelected ? '#9a3412' : '#0f172a' }}>
                {fmtTime(s.slot)}
              </span>
              
              {/* Capacity Progress Mini-Bar */}
              <div style={{ height: '4px', backgroundColor: '#e2e8f0', borderRadius: '99px', overflow: 'hidden', margin: '2px 0' }}>
                <div style={{
                  height: '100%',
                  width: `${tooSoon ? 0 : s.pct}%`,
                  backgroundColor: isFull ? '#ef4444' : (s.pct > 70 ? '#f59e0b' : '#10b981')
                }} />
              </div>

              <span style={{ fontSize: '10px', fontWeight: '600', color: isFull ? '#ef4444' : '#64748b' }}>
                {tooSoon ? 'Too soon' : (isFull ? 'Full (0 left)' : `${s.left} spots left`)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
