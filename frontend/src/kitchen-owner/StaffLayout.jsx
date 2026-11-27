import { Link, NavLink, Outlet } from 'react-router-dom'
import { ChefHat, LogOut, ShieldCheck, Store, Zap } from 'lucide-react'
import { useApp } from '../store/AppContext.jsx'
import { fmtTime } from '../utils/helpers.js'

export default function StaffLayout() {
  const { now, clock, staffUser, logoutStaff } = useApp()
  const link = ({ isActive: active }) => 'role-link' + (active ? ' on' : '')

  return (
    <>
      <header className="oq-nav">
        <div className="oq-nav-in">
          <Link to="/kitchen" className="oq-brand">
            <span className="oq-mark"><Zap size={15} fill="currentColor" /></span>
            <span>Order<em>Quick</em></span>
            <span className="demo-pill" style={{ marginLeft: 4 }}>STAFF</span>
          </Link>

          <nav className="oq-roles" aria-label="Staff workspace switcher">
            <NavLink to="/kitchen" className={link}><ChefHat size={14} /> Kitchen</NavLink>
            <NavLink to="/owner" className={link}><Store size={14} /> Owner</NavLink>
          </nav>

          <div className="oq-right">
            <div className="oq-clock" title={clock.demo ? 'Outside canteen hours — demo clock active' : 'Live time'}>
              <span>{fmtTime(now)}</span>
              {clock.demo && <span className="demo-pill">DEMO</span>}
            </div>
            <div className="row" style={{ gap: 4 }}>
              <Link to="/owner/profile" className="nav-orders" title="Owner Profile & Settings">
                <ShieldCheck size={13} />
                <span>{staffUser?.fullName || staffUser?.username || 'Staff'}</span>
              </Link>
              <button className="icon-btn" onClick={logoutStaff} title="Sign out of staff portal" aria-label="Sign out">
                <LogOut size={13} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <Outlet />
    </>
  )
}
