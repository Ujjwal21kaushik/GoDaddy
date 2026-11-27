import { useMemo } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { LogOut, Receipt, ShoppingBag, User, Zap } from 'lucide-react'
import { useApp } from '../store/AppContext.jsx'
import { cartSummary, fmtTime, inr, isActive, isPendingApproval } from '../utils/helpers.js'
import CartDrawer from './components/CartDrawer.jsx'
import AlternativeModal from './components/AlternativeModal.jsx'

export default function StudentLayout() {
  const {
    now, clock, state, menu, combos, studentOrders,
    setCartOpen, user, logoutStudent, altItem, setAltItem,
  } = useApp()

  const sum = useMemo(() => cartSummary(state.cart, menu, combos), [state.cart, menu, combos])
  const userKey = user?.username?.toLowerCase()
  const activeOrders = studentOrders.filter(
    (o) => (!o.usernameKey || (userKey && o.usernameKey === userKey)) && o.day === 0 && (isActive(o) || isPendingApproval(o))
  ).length

  return (
    <>
      <header className="oq-nav">
        <div className="oq-nav-in">
          <Link to={user ? '/' : '/login'} className="oq-brand">
            <span className="oq-mark"><Zap size={15} fill="currentColor" /></span>
            <span>Order<em>Quick</em></span>
          </Link>

          <div className="oq-right">
            <div className="oq-clock" title={clock.demo ? 'Outside canteen hours — demo clock active' : 'Live time'}>
              <span>{fmtTime(now)}</span>
              {clock.demo && <span className="demo-pill">DEMO</span>}
            </div>
            {user && (
              <>
                <div className="row" style={{ gap: 4 }}>
                  <Link to="/login" className="nav-orders" title={`Signed in as ${user.username} · ${user.phone}`}>
                    <User size={13} />
                    <span>{user.username}</span>
                  </Link>
                  <button className="icon-btn" onClick={logoutStudent} title="Sign out" aria-label="Sign out">
                    <LogOut size={13} />
                  </button>
                </div>
                <Link to="/orders" className="nav-orders">
                  <Receipt size={14} />
                  <span>Orders</span>
                  {activeOrders > 0 && <i className="badge">{activeOrders}</i>}
                </Link>
                <button className="cart-btn" onClick={() => setCartOpen(true)}>
                  <ShoppingBag size={14} />
                  <span>{sum.units > 0 ? `${sum.units} · ${inr(sum.total)}` : 'Bag'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <Outlet />

      {user && <CartDrawer />}
      {user && altItem && <AlternativeModal item={altItem} onClose={() => setAltItem(null)} />}
    </>
  )
}
