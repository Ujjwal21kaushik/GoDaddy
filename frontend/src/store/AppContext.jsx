import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { COMBO } from '../data/mock.js'
import { readClock, useClock } from '../utils/clock.js'
import { cartSummary, genOrderId, isEffAvail, slotStats } from '../utils/helpers.js'
import { api } from '../services/api.js'

const KEY = 'yellow-rush-hour:v1'
const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

const INITIAL_CAPS = { def: 20, overrides: {} }

const INITIAL_BASELINE = {
  aov: 85,
  slotOrders: {
    720: 8,
    735: 12,
    780: 19,
    795: 14,
    810: 9
  },
  weekly: [
    { day: 'Mon', revenue: 6400, orders: 75 },
    { day: 'Tue', revenue: 7100, orders: 82 },
    { day: 'Wed', revenue: 6800, orders: 79 },
    { day: 'Thu', revenue: 7500, orders: 88 },
    { day: 'Fri', revenue: 9200, orders: 110 },
    { day: 'Sat', revenue: 3500, orders: 40 }
  ]
}

const INITIAL_STATE = {
  menu: [],
  orders: [],
  cart: {},
  stockouts: [],
  missed: [],
  caps: INITIAL_CAPS,
  baseline: INITIAL_BASELINE,
  profile: { name: 'Ujjwal' },
  tomorrowPlan: {}
}

function reducer(s, a) {
  switch (a.type) {
    case 'HYDRATE': return a.state
    case 'SYNC_MENU': {
      if (!a.menu || !a.menu.length) return s
      return { ...s, menu: a.menu }
    }
    case 'SYNC_ORDERS': {
      return { ...s, orders: a.orders || [] }
    }
    case 'CART_SET': {
      const cart = { ...s.cart }
      if (a.qty <= 0) delete cart[a.id]; else cart[a.id] = a.qty
      return { ...s, cart }
    }
    case 'CART_CLEAR': return { ...s, cart: {} }
    case 'PROFILE': return { ...s, profile: { ...s.profile, ...a.patch } }
    case 'PLACE': {
      const stockouts = [...s.stockouts]
      const menu = s.menu.map((it) => {
        const l = a.order.items.find((x) => x.id === it.id)
        if (!l) return it
        const stock = Math.max(0, it.stock - l.qty)
        if (it.stock > 0 && stock === 0) stockouts.push({ itemId: it.id, min: a.min, ts: Date.now() })
        return { ...it, stock, available: stock > 0 }
      })
      return { ...s, menu, stockouts, orders: [a.order, ...s.orders], cart: {} }
    }
    case 'STATUS':
      return { ...s, orders: s.orders.map((o) => o.id === a.id ? { ...o, status: a.status, history: [...(o.history || []), { status: a.status, at: Date.now() }] } : o) }
    case 'MISSED': return { ...s, missed: [a.rec, ...s.missed] }
    case 'CAP_DEFAULT': return { ...s, caps: { ...s.caps, def: Math.max(0, a.n) } }
    case 'CAP_SLOT': {
      const overrides = { ...s.caps.overrides }
      if (a.cap == null) delete overrides[a.slot]; else overrides[a.slot] = Math.max(0, a.cap)
      return { ...s, caps: { ...s.caps, overrides } }
    }
    case 'PLAN': return { ...s, tomorrowPlan: { ...s.tomorrowPlan, ...a.map } }
    case 'STOCK_SET': {
      const updatedMenu = s.menu.map((x) => x.id === a.id ? { ...x, stock: Math.max(0, a.stock), available: a.stock > 0 } : x)
      return { ...s, menu: updatedMenu }
    }
    case 'MENU_SAVE': {
      const exists = s.menu.some((x) => x.id === a.item.id)
      const updated = exists ? s.menu.map((x) => x.id === a.item.id ? { ...x, ...a.item } : x) : [...s.menu, a.item]
      return { ...s, menu: updated }
    }
    case 'MENU_DELETE': {
      const cart = { ...s.cart }; delete cart[a.id]
      return { ...s, menu: s.menu.filter((x) => x.id !== a.id), cart }
    }
    default: return s
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
  const clock = useClock()
  const [altItem, setAltItem] = useState(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [toasts, setToasts] = useState([])
  const ref = useRef(state)
  ref.current = state

  // Live Backend Polling (Syncs live menu & orders every 2s)
  const pollBackend = useCallback(async () => {
    try {
      const [remoteMenu, remoteOrders] = await Promise.all([
        api.getMenu().catch(() => null),
        api.getOrders().catch(() => null)
      ])
      if (remoteMenu && Array.isArray(remoteMenu)) {
        dispatch({ type: 'SYNC_MENU', menu: remoteMenu })
      }
      if (remoteOrders && Array.isArray(remoteOrders)) {
        dispatch({ type: 'SYNC_ORDERS', orders: remoteOrders })
      }
    } catch {}
  }, [])

  useEffect(() => {
    pollBackend()
    const timer = setInterval(pollBackend, 2000)
    return () => clearInterval(timer)
  }, [pollBackend])

  const toast = useCallback((msg, tone = 'ok') => {
    const id = Math.random()
    setToasts((t) => [...t, { id, msg, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800)
  }, [])

  const logMissed = useCallback(({ item, qty, alt = null, reason = 'sold-out' }) => {
    const c = readClock()
    const rec = {
      id: 'ml' + Date.now() + Math.random().toString(36).slice(2, 5), itemId: item.id, name: item.name, cat: item.cat, price: item.price, qty,
      day: 0, hour: Math.floor(c.min / 60), bucket: Math.floor((c.min % 60) / 15) * 15, altId: alt?.id ?? null, altName: alt?.name ?? null,
      altPrice: alt?.price ?? 0, ts: Date.now(), seeded: false, reason,
    }
    dispatch({ type: 'MISSED', rec })
    api.logMissedDemand(rec).catch(() => {})
  }, [])

  const setQty = useCallback((item, qty) => {
    const it = ref.current.menu.find((x) => x.id === item.id) || item
    if (!it) return

    if (!isEffAvail(it) && qty > 0) {
      setAltItem(it)
      return
    }

    if (qty > it.stock) {
      toast(`Only ${it.stock} left of ${it.name}`, 'warn')
      logMissed({ item: it, qty: 1, reason: 'stock-limit' })
      return
    }

    dispatch({ type: 'CART_SET', id: item.id, qty })
  }, [toast, logMissed])

  const addCombo = useCallback(() => {
    const menu = ref.current.menu
    const blocked = COMBO.items.map((c) => menu.find((x) => x.id === c.id)).find((it) => !it || !isEffAvail(it))
    if (blocked) { setAltItem(blocked); return }
    COMBO.items.forEach((c) => dispatch({ type: 'CART_SET', id: c.id, qty: (ref.current.cart[c.id] || 0) + c.qty }))
    toast('Combo added — you saved with the deal')
  }, [toast])

  const placeOrder = useCallback(({ name, slot, payment }) => {
    const s = ref.current
    const sum = cartSummary(s.cart, s.menu, COMBO)
    if (!sum.lines.length) return { ok: false, error: 'Your cart is empty' }
    if (sum.hasUnavailable) return { ok: false, error: 'Some items just sold out — remove them to continue' }
    if (slot == null) return { ok: false, error: 'Pick a pickup slot' }
    const st = slotStats(slot, s.orders, s.caps)
    if (st.state === 'full') return { ok: false, error: 'That slot just filled up — pick another' }
    if (!name || name.trim().length < 2) return { ok: false, error: 'Enter your name or roll number' }

    const orderPayload = {
      id: genOrderId(s.orders),
      name: name.trim(),
      slot,
      payment,
      items: sum.lines.map((l) => ({ id: l.item.id, name: l.item.name, price: l.item.price, qty: l.qty })),
      total: sum.total,
      discount: sum.discount,
      createdAt: Date.now(),
      status: 'confirmed',
      history: [{ status: 'confirmed', at: Date.now() }],
      day: 0,
      mine: true
    }

    dispatch({ type: 'PROFILE', patch: { name: name.trim() } })
    dispatch({ type: 'PLACE', order: orderPayload, min: readClock().min })

    api.placeOrder(orderPayload).catch(err => {
      console.warn('Could not post order to backend:', err.message)
    })

    return { ok: true, order: orderPayload }
  }, [])

  const setStatus = useCallback((id, status) => {
    dispatch({ type: 'STATUS', id, status })
    api.updateOrderStatus(id, status).catch(() => {})
  }, [])

  // OWNER INVENTORY PERSISTENCE: Syncs directly to Backend Database!
  const setStock = useCallback((id, newStock) => {
    dispatch({ type: 'STOCK_SET', id, stock: newStock })
    // Also save directly to backend API
    const targetItem = ref.current.menu.find(m => m.id === id)
    if (targetItem) {
      api.saveMenuItem({ ...targetItem, stock: newStock, available: newStock > 0 }).catch(() => {})
    }
  }, [])

  // OWNER MENU MANAGER PERSISTENCE
  const saveMenuItem = useCallback((item) => {
    dispatch({ type: 'MENU_SAVE', item })
    api.saveMenuItem(item).catch(() => {})
  }, [])

  const deleteMenuItem = useCallback((id) => {
    dispatch({ type: 'MENU_DELETE', id })
    api.deleteMenuItem(id).catch(() => {})
  }, [])

  const resetDemo = useCallback(async () => {
    try {
      await fetch('http://localhost:5000/demo/reset', { method: 'POST' })
    } catch {}
    localStorage.removeItem(KEY)
    dispatch({ type: 'SYNC_ORDERS', orders: [] })
    toast('Orders cleared & database reset')
  }, [toast])

  const value = useMemo(() => ({
    state, dispatch, clock, now: clock.min, toast, toasts,
    altItem, setAltItem, cartOpen, setCartOpen,
    setQty, addCombo, placeOrder, setStatus, logMissed, resetDemo,
    setStock, saveMenuItem, deleteMenuItem,
    slot: (sl) => slotStats(sl, state.orders, state.caps),
    cart: state.cart, menu: state.menu, orders: state.orders,
  }), [state, clock, toasts, altItem, cartOpen, setQty, addCombo, placeOrder, setStatus, logMissed, resetDemo, setStock, saveMenuItem, deleteMenuItem, toast])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
