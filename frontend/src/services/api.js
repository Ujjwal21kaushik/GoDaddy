// API integration seam. Connects to backend at http://localhost:5000
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

async function request(path, options = {}) {
  try {
    const res = await fetch(`${BASE}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options })
    if (!res.ok) throw new Error(`API ${res.status}`)
    return res.json()
  } catch (err) {
    console.warn(`[CanteenIQ API fallback] Could not reach ${BASE}${path}:`, err.message)
    throw err
  }
}

export const api = {
  getMenu: () => request('/menu'),                                   // -> store.menu
  saveMenuItem: (item) => request('/menu', { method: 'POST', body: JSON.stringify(item) }),
  deleteMenuItem: (id) => request(`/menu/${id}`, { method: 'DELETE' }),
  getSlots: () => request('/slots'),                                 // -> slotStats / caps
  setSlotCapacity: (slot, cap) => request(`/slots/${slot}`, { method: 'PUT', body: JSON.stringify({ cap }) }),
  placeOrder: (order) => request('/orders', { method: 'POST', body: JSON.stringify(order) }),
  getOrders: () => request('/orders'),
  updateOrderStatus: (id, status) => request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  logMissedDemand: (rec) => request('/demand/missed', { method: 'POST', body: JSON.stringify(rec) }),
  getDemandInsights: (range) => request(`/demand/insights?range=${range}`),
}
