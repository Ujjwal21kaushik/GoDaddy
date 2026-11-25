import { Navigate, Route, Routes } from 'react-router-dom'
import RoleBar from './components/Navbar.jsx'
import Toasts from './components/Toasts.jsx'
import StudentApp from './pages/student/StudentApp.jsx'
import MyOrders from './pages/student/MyOrders.jsx'
import OrderTrack from './pages/student/OrderTrack.jsx'
import Kitchen from './pages/Kitchen.jsx'
import OwnerLayout from './pages/owner/OwnerLayout.jsx'
import Overview from './pages/owner/Overview.jsx'
import MenuManager from './pages/owner/MenuManager.jsx'
import SlotManager from './pages/owner/SlotManager.jsx'
import Inventory from './pages/owner/Inventory.jsx'
import Demand from './pages/owner/Demand.jsx'

export default function App() {
  return (
    <>
      <RoleBar />
      <Routes>
        <Route path="/" element={<StudentApp />} />
        <Route path="/orders" element={<MyOrders />} />
        <Route path="/order/:id" element={<OrderTrack />} />
        <Route path="/kitchen" element={<Kitchen />} />
        <Route path="/owner" element={<OwnerLayout />}>
          <Route index element={<Overview />} />
          <Route path="menu" element={<MenuManager />} />
          <Route path="slots" element={<SlotManager />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="demand" element={<Demand />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toasts />
    </>
  )
}
