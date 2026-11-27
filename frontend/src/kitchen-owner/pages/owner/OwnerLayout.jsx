import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { AlertTriangle, BarChart3, Bell, LayoutDashboard, Package, Soup, Sparkles, Timer, User, X } from 'lucide-react'
import { useApp } from '../../../store/AppContext.jsx'

const tabs = [
  { to: '/owner', end: true, label: 'Overview', icon: LayoutDashboard },
  { to: '/owner/approvals', label: 'Approvals', icon: Bell },
  { to: '/owner/demand', label: 'Demand Intelligence', icon: BarChart3, badge: 'AI' },
  { to: '/owner/menu', label: 'Menu', icon: Soup },
  { to: '/owner/combos', label: 'Combos', icon: Sparkles },
  { to: '/owner/slots', label: 'Pickup Slots', icon: Timer },
  { to: '/owner/inventory', label: 'Inventory', icon: Package },
  { to: '/owner/profile', label: 'Profile', icon: User },
]

export default function OwnerLayout() {
  const { state, orders, now } = useApp()
  const nav = useNavigate()
  const prevStockMap = useRef({})
  const [stockoutAlert, setStockoutAlert] = useState(null)

  const uncollectedOrders = orders.filter((o) => {
    return !['delivered', 'collected', 'cancelled', 'rejected', 'expired', 'pending_approval', 'counter_offer', 'cancel_requested'].includes(o.status) && (now > o.slot + 30)
  })
  const pendingApprovals = orders.filter((o) => ['pending_approval', 'cancel_requested'].includes(o.status))
  const lateApprovals = pendingApprovals.filter((o) => Date.now() > (o.cancelDeadline || o.approvalDeadline || 0))
  const outCount = state.menu.filter((m) => m.stock === 0).length

  useEffect(() => {
    if (!state.menu || !state.menu.length) return
    state.menu.forEach((item) => {
      const prev = prevStockMap.current[item.id]
      if (prev !== undefined && prev > 0 && item.stock === 0) {
        setStockoutAlert(item)
      }
      prevStockMap.current[item.id] = item.stock
    })
  }, [state.menu])

  return (
    <div className="page wide">
      <div className="page-head" style={{ marginBottom: 8 }}>
        <div>
          <h1 className="h1" style={{ margin: 0 }}>Owner Console</h1>
          <p className="muted">Operations, approvals, slot capacity, and demand analytics</p>
        </div>
        <div className="row">
          {pendingApprovals.length > 0 && (
            <button
              className="btn-ghost sm"
              style={{
                color: lateApprovals.length ? 'var(--red)' : 'var(--amber)',
                borderColor: lateApprovals.length ? 'var(--red-border)' : 'var(--amber-border)',
                background: lateApprovals.length ? 'var(--red-soft)' : 'var(--amber-soft)'
              }}
              onClick={() => nav('/owner/approvals')}
            >
              <Bell size={13} /> {pendingApprovals.length} Request{pendingApprovals.length > 1 ? 's' : ''} Awaiting Approval{lateApprovals.length ? ' · Overdue' : ''}
            </button>
          )}
          {uncollectedOrders.length > 0 && (
            <button
              className="btn-ghost sm"
              style={{ color: 'var(--red)', borderColor: 'var(--red-border)', background: 'var(--red-soft)' }}
              onClick={() => nav('/owner/slots')}
            >
              <AlertTriangle size={13} /> {uncollectedOrders.length} Overdue Pickups
            </button>
          )}
          {outCount > 0 && (
            <button
              className="btn-ghost sm"
              style={{ color: 'var(--red)', borderColor: 'var(--red-border)', background: 'var(--red-soft)' }}
              onClick={() => nav('/owner/inventory')}
            >
              <Package size={13} /> {outCount} Out of Stock
            </button>
          )}
        </div>
      </div>

      <nav className="tabs">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => 'tab' + (isActive ? ' on' : '')}>
            <t.icon size={15} /> {t.label}{t.badge && <em>{t.badge}</em>}
          </NavLink>
        ))}
      </nav>

      <Outlet />

      {stockoutAlert && (
        <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && setStockoutAlert(null)}>
          <div className="modal" role="dialog" aria-modal="true" style={{ borderColor: 'var(--red)' }}>
            <div className="modal-head">
              <h3 className="row" style={{ color: 'var(--red)' }}>
                <AlertTriangle size={18} /> Stockout Alert
              </h3>
              <button className="icon-btn" onClick={() => setStockoutAlert(null)} aria-label="Close"><X size={16} /></button>
            </div>
            <div className="notice red" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 28 }}>{stockoutAlert.emoji}</span>
              <div>
                <b style={{ display: 'block', fontSize: 15, color: 'var(--ink)' }}>{stockoutAlert.name}</b>
                <small style={{ color: 'var(--red)', fontWeight: 700, display: 'block' }}>Current Shelf Stock: 0 pcs — marked Sold Out</small>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  {stockoutAlert.name} is now out of stock (0 pcs). Please add stock in Inventory so students can order it again.
                </div>
              </div>
            </div>
            <div className="row">
              <button
                className="btn-primary accent grow"
                onClick={() => {
                  const id = stockoutAlert.id
                  setStockoutAlert(null)
                  nav('/owner/inventory', { state: { highlightId: id } })
                }}
              >
                <Package size={14} /> Open Inventory
              </button>
              <button className="btn-ghost" onClick={() => setStockoutAlert(null)}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
