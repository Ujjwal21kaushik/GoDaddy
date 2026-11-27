import { Check } from 'lucide-react'

const STAGES = [
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'delivered', label: 'Delivered' },
]

export default function OrderStepper({ status }) {
  const norm = (status === 'confirmed' || status === 'almost') ? 'preparing' : status === 'collected' ? 'delivered' : status
  const currentIndex = STAGES.findIndex((s) => s.key === norm)
  const activeIdx = currentIndex >= 0 ? currentIndex : 0
  const progressPct = (activeIdx / (STAGES.length - 1)) * 100

  return (
    <div className="stepper">
      <div className="stepper-rail">
        <div className="stepper-track" />
        <div className="stepper-fill" style={{ width: `calc(${progressPct}% - ${progressPct === 100 ? 28 : 0}px)` }} />
        {STAGES.map((stg, i) => {
          const isCompleted = i < activeIdx || norm === 'delivered'
          const isCurrent = i === activeIdx && norm !== 'delivered'
          return (
            <div key={stg.key} className="step-node">
              <div className={`step-box ${isCompleted ? 'done' : isCurrent ? 'cur' : ''}`}>
                {isCompleted ? <Check size={14} strokeWidth={3} /> : `0${i + 1}`}
              </div>
              <span className={`step-lbl ${isCurrent ? 'cur' : isCompleted ? 'done' : ''}`}>
                {stg.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
