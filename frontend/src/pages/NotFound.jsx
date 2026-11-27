import { Link } from 'react-router-dom'
import { ArrowRight, Compass, Receipt, UtensilsCrossed } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="page narrow">
      <div className="empty" style={{ padding: '56px 28px', borderStyle: 'solid' }}>
        <span className="empty-code">HTTP 404</span>
        <div className="empty-icon"><Compass size={22} /></div>
        <h1 className="h1" style={{ fontSize: 28, marginTop: 4 }}>This route isn&apos;t on the menu.</h1>
        <p>The page you opened doesn&apos;t exist or was moved. Jump back to the storefront or check your orders.</p>
        <div className="row" style={{ marginTop: 10, justifyContent: 'center' }}>
          <Link to="/" className="btn-primary accent">
            <UtensilsCrossed size={15} /> Browse Menu <ArrowRight size={14} />
          </Link>
          <Link to="/orders" className="btn-ghost">
            <Receipt size={15} /> My Orders
          </Link>
        </div>
      </div>
    </div>
  )
}
