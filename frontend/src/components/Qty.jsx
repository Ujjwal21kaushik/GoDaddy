import { Minus, Plus } from 'lucide-react'

export default function Qty({ value, onChange, size = 'md' }) {
  return (
    <div className={`qty ${size}`}>
      <button aria-label="Decrease" onClick={() => onChange(value - 1)}><Minus size={14} /></button>
      <span>{value}</span>
      <button aria-label="Increase" onClick={() => onChange(value + 1)}><Plus size={14} /></button>
    </div>
  )
}
