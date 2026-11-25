import { X } from 'lucide-react'

export default function Modal({ title, onClose, children, wide }) {
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true">
        <div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
        {children}
      </div>
    </div>
  )
}
