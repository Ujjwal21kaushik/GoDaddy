import { Check, Sparkles } from 'lucide-react'
import { fmtTime, PREORDER_MIN } from '../../utils/helpers.js'

export default function SlotPicker({ slots, selected, onSelect, recommended, now, lead }) {
  return (
    <div style={{ marginTop: 6 }}>
      {recommended != null && selected !== recommended && (
        <button className="slot-reco" onClick={() => onSelect(recommended)}>
          <Sparkles size={13} />
          <span>Fastest Slot: <b className="mono">{fmtTime(recommended)}</b> — Tap to select</span>
        </button>
      )}

      <div className="slot-grid">
        {slots.map((s) => {
          const tooSoon = s.slot < now + lead
          const isFull = s.state === 'full'
          const off = isFull || tooSoon
          const pre = s.slot - now > PREORDER_MIN
          const isSelected = selected === s.slot
          const barColor = isFull ? '#E11D48' : s.pct > 70 ? '#D97706' : '#059669'

          return (
            <button
              key={s.slot}
              disabled={off}
              onClick={() => onSelect(s.slot)}
              className={`slot-btn ${isSelected ? 'on' : ''} ${off ? 'off' : ''}`}
            >
              {isSelected && <span className="slot-check"><Check size={12} strokeWidth={3} /></span>}
              <span className="slot-time">{fmtTime(s.slot)}</span>
              <div className="slot-bar">
                <i style={{ width: `${tooSoon ? 0 : s.pct}%`, background: barColor }} />
              </div>
              <span className={`slot-meta ${isFull ? 'full' : !tooSoon && pre ? 'pre' : ''}`}>
                {isFull ? 'Full (0 left)' : tooSoon ? 'Too soon' : pre ? 'Pre-order' : `${s.left} left`}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
