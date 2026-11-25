import { useApp } from '../store/AppContext.jsx'

export default function Toasts() {
  const { toasts } = useApp()
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => <div key={t.id} className={`toast ${t.tone}`}>{t.msg}</div>)}
    </div>
  )
}
