import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Toasts from './components/Toasts.jsx'
import { useApp } from './store/AppContext.jsx'
import NotFound from './pages/NotFound.jsx'

// Student workspace
import StudentLayout from './student/StudentLayout.jsx'
import StudentLogin from './student/pages/StudentLogin.jsx'
import StudentApp from './student/pages/StudentApp.jsx'
import MyOrders from './student/pages/MyOrders.jsx'
import OrderTrack from './student/pages/OrderTrack.jsx'

// Kitchen & Owner workspace
import StaffLayout from './kitchen-owner/StaffLayout.jsx'
import StaffLogin from './kitchen-owner/pages/StaffLogin.jsx'
import Kitchen from './kitchen-owner/pages/Kitchen.jsx'
import OwnerLayout from './kitchen-owner/pages/owner/OwnerLayout.jsx'
import Overview from './kitchen-owner/pages/owner/Overview.jsx'
import MenuManager from './kitchen-owner/pages/owner/MenuManager.jsx'
import Combos from './kitchen-owner/pages/owner/Combos.jsx'
import SlotManager from './kitchen-owner/pages/owner/SlotManager.jsx'
import Inventory from './kitchen-owner/pages/owner/Inventory.jsx'
import Demand from './kitchen-owner/pages/owner/Demand.jsx'
import Approvals from './kitchen-owner/pages/owner/Approvals.jsx'
import Profile from './kitchen-owner/pages/owner/Profile.jsx'

function AuthLoading() {
  return (
    <div className="page narrow" style={{ textAlign: 'center', paddingTop: 64 }}>
      <p className="muted mono">Checking session…</p>
    </div>
  )
}

function RequireStudent({ children }) {
  const { user, authReady } = useApp()
  const loc = useLocation()
  if (!authReady) return <AuthLoading />
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />
  return children
}

function RequireStaff({ children }) {
  const { staffUser, authReady } = useApp()
  if (!authReady) return <AuthLoading />
  if (!staffUser || staffUser.role !== 'staff') return <StaffLogin />
  return children
}

export default function App() {
  return (
    <>
      <Routes>
        {/* Student routes */}
        <Route element={<StudentLayout />}>
          <Route path="/login" element={<StudentLogin />} />
          <Route path="/" element={<RequireStudent><StudentApp /></RequireStudent>} />
          <Route path="/orders" element={<RequireStudent><MyOrders /></RequireStudent>} />
          <Route path="/order/:id" element={<RequireStudent><OrderTrack /></RequireStudent>} />
          <Route path="*" element={<RequireStudent><NotFound /></RequireStudent>} />
        </Route>

        {/* Kitchen & Owner routes (isolated staff folder & login, exact /kitchen and /owner URLs) */}
        <Route element={<RequireStaff><StaffLayout /></RequireStaff>}>
          <Route path="/kitchen" element={<Kitchen />} />
          <Route path="/owner" element={<OwnerLayout />}>
            <Route index element={<Overview />} />
            <Route path="menu" element={<MenuManager />} />
            <Route path="combos" element={<Combos />} />
            <Route path="slots" element={<SlotManager />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="demand" element={<Demand />} />
            <Route path="approvals" element={<Approvals />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Route>
      </Routes>
      <Toasts />
    </>
  )
}
