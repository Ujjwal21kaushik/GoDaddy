import { useState, useEffect, useRef } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BarChart3, LayoutDashboard, Package, Soup, Timer, AlertTriangle, X, Plus, Bell } from 'lucide-react'
import { useApp } from '../../store/AppContext.jsx'

const tabs = [
  { to: '/owner', end: true, label: 'Overview', icon: LayoutDashboard },
  { to: '/owner/demand', label: 'Demand Intelligence', icon: BarChart3, badge: 'NEW' },
  { to: '/owner/menu', label: 'Menu', icon: Soup },
  { to: '/owner/slots', label: 'Pickup Slots', icon: Timer },
  { to: '/owner/inventory', label: 'Inventory', icon: Package },
]

export default function OwnerLayout() {
  const { state, orders, now, dispatch, toast } = useApp()
  const nav = useNavigate()
  const prevStockMap = useRef({})
  const [stockoutAlert, setStockoutAlert] = useState(null)

  const uncollectedOrders = orders.filter((o) => {
    return o.status !== 'collected' && o.status !== 'cancelled' && (now > o.slot + 30)
  })

  // Watch for stock hitting 0 in real-time
  useEffect(() => {
    if (!state.menu || !state.menu.length) return

    state.menu.forEach((item) => {
      const prev = prevStockMap.current[item.id]
      // Item just became out of stock!
      if (prev !== undefined && prev > 0 && item.stock === 0) {
        setStockoutAlert(item)
      }
      prevStockMap.current[item.id] = item.stock
    })
  }, [state.menu])

  const handleQuickRestock = (item, qty) => {
    dispatch({ type: 'STOCK_SET', id: item.id, stock: qty })
    toast(`Restocked +${qty} ${item.name}!`, 'ok')
    setStockoutAlert(null)
  }

  return (
    <div className="page wide">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <h1 className="h1" style={{ margin: 0 }}>Canteen Owner</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {uncollectedOrders.length > 0 && (
            <button 
              className="btn-ghost sm" 
              style={{ color: '#dc2626', borderColor: '#fca5a5', backgroundColor: '#fef2f2', fontWeight: 'bold' }}
              onClick={() => nav('/owner/slots')}
            >
              <AlertTriangle size={14} /> {uncollectedOrders.length} Overdue Pickups
            </button>
          )}
          {state.menu.filter(m => m.stock === 0).length > 0 && (
            <button 
              className="btn-ghost sm" 
              style={{ color: '#ef4444', borderColor: '#fca5a5', backgroundColor: '#fef2f2' }}
              onClick={() => nav('/owner/inventory')}
            >
              <Bell size={14} /> {state.menu.filter(m => m.stock === 0).length} Items Out of Stock
            </button>
          )}
        </div>
      </div>

      <nav className="tabs">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => 'tab' + (isActive ? ' on' : '')}>
            <t.icon size={16} /> {t.label}{t.badge && <em>{t.badge}</em>}
          </NavLink>
        ))}
      </nav>

      <Outlet />

      {/* OUT OF STOCK CRITICAL POPUP MODAL */}
      {stockoutAlert && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '440px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            border: '2px solid #ef4444'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>Stockout Alert!</h3>
                  <small style={{ color: '#64748b' }}>Item just reached zero stock</small>
                </div>
              </div>
              <button 
                onClick={() => setStockoutAlert(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '32px' }}>{stockoutAlert.emoji}</span>
              <div>
                <b style={{ fontSize: '16px', color: '#0f172a' }}>{stockoutAlert.name}</b>
                <div style={{ fontSize: '13px', color: '#ef4444', fontWeight: 'bold', marginTop: '2px' }}>
                  🔴 Current Usable Stock: 0 pcs
                </div>
                <small style={{ color: '#64748b' }}>Students will see "Sold Out" until restocked.</small>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => handleQuickRestock(stockoutAlert, 20)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  backgroundColor: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={16} /> Quick Restock +20
              </button>
              <button
                onClick={() => {
                  setStockoutAlert(null)
                  nav('/owner/inventory')
                }}
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Open Inventory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
