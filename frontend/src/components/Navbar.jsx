import { NavLink } from 'react-router-dom'
import { ChefHat, Store, UtensilsCrossed, Zap } from 'lucide-react'
import { useApp } from '../store/AppContext.jsx'
import { fmtTime } from '../utils/helpers.js'

export default function RoleBar() {
  const { now, clock } = useApp()
  const link = ({ isActive }) => 'role-link' + (isActive ? ' on' : '')
  return (
    <div className="rolebar">
      <div className="rolebar-in">
        <div className="rb-brand"><Zap size={15} fill="currentColor" /> Yellow · Rush Hour</div>
        <nav>
          <NavLink to="/" end className={link}><UtensilsCrossed size={14} /> Student</NavLink>
          <NavLink to="/kitchen" className={link}><ChefHat size={14} /> Kitchen</NavLink>
          <NavLink to="/owner" className={link}><Store size={14} /> Owner</NavLink>
        </nav>
        <div className="rb-clock" title={clock.demo ? 'Outside canteen hours — using a demo clock' : 'Live time'}>
          {fmtTime(now)}{clock.demo && <span className="demo-pill">demo clock</span>}
        </div>
      </div>
    </div>
  )
}
