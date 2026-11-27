import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { readClock, useClock } from '../utils/clock.js'
import { APPROVAL, cartSummary, CLOSE, cookMinutes, earliestSlot, exceedsStock, genOrderId, isEffAvail, isPreOrder, needsApproval, OPEN, slotStats } from '../utils/helpers.js'
import { api, clearSession, getSavedSession, refreshScope, setAuthFailureHandler, setSession, updateSavedUser } from '../services/api.js'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

const INITIAL_CAPS = { def: 20, overrides: {} }

const INITIAL_STATE = {
  menu: [],
  combos: [],
  orders: [],
  studentOrders: [],
  slotCounts: {},
  activeBySlot: {},
  activeUnits: 0,
  cart: {},
  stockouts: [],
  missed: [],
  caps: INITIAL_CAPS,
  hours: { open: OPEN, close: CLOSE },
  user: null,
  staffUser: null,
}

function reducer(s, a) {
  switch (a.type) {
    case 'SYNC_MENU': {
      if (!a.menu || !a.menu.length) return s
      return { ...s, menu: a.menu }
    }
    case 'SYNC_ORDERS': {
      return { ...s, orders: a.orders || [] }
    }
    case 'SYNC_STUDENT_ORDERS': {
      return { ...s, studentOrders: a.orders || [] }
    }
    case 'SYNC_SLOTS': {
      return {
        ...s,
        caps: a.caps || s.caps,
        hours: a.hours || s.hours,
        slotCounts: a.slotCounts || s.slotCounts,
        activeBySlot: a.activeBySlot || s.activeBySlot,
        activeUnits: typeof a.activeUnits === 'number' ? a.activeUnits : s.activeUnits,
      }
    }
    case 'SYNC_MISSED': {
      return { ...s, missed: a.missed || [] }
    }
    case 'HOURS_SET': {
      return { ...s, hours: { open: a.open, close: a.close } }
    }
    case 'CART_SET': {
      const cart = { ...s.cart }
      if (a.qty <= 0) delete cart[a.id]; else cart[a.id] = a.qty
      return { ...s, cart }
    }
    case 'CART_CLEAR': return { ...s, cart: {} }
    case 'USER_SET': return {
      ...s,
      user: a.user,
      studentOrders: [],
    }
    case 'STAFF_SET': return {
      ...s,
      staffUser: a.user,
      ...(a.user ? {} : { orders: [], missed: [] }),
    }
    case 'PLACE': {
      const nextStudentOrders = [a.order, ...s.studentOrders]
      const nextStaffOrders = s.staffUser ? [a.order, ...s.orders] : s.orders
      // Orders awaiting owner approval do not touch stock until approved
      if (a.order.status === 'pending_approval') {
        return { ...s, orders: nextStaffOrders, studentOrders: nextStudentOrders, cart: {} }
      }
      const stockouts = [...s.stockouts]
      const menu = s.menu.map((it) => {
        const l = a.order.items.find((x) => x.id === it.id)
        if (!l) return it
        const stock = Math.max(0, it.stock - l.qty)
        if (it.stock > 0 && stock === 0) stockouts.push({ itemId: it.id, min: a.min, ts: Date.now() })
        return { ...it, stock, available: stock > 0 }
      })
      return { ...s, menu, stockouts, orders: nextStaffOrders, studentOrders: nextStudentOrders, cart: {} }
    }
    case 'STATUS': {
      const patchFn = (o) => o.id === a.id
        ? { ...o, status: a.status, history: [...(o.history || []), { status: a.status, at: Date.now() }] }
        : o
      return { ...s, orders: s.orders.map(patchFn), studentOrders: s.studentOrders.map(patchFn) }
    }
    case 'ORDER_PATCH': {
      const patchFn = (o) => (o.id === a.id ? { ...o, ...a.patch } : o)
      return { ...s, orders: s.orders.map(patchFn), studentOrders: s.studentOrders.map(patchFn) }
    }
    case 'MISSED': return { ...s, missed: [a.rec, ...s.missed] }
    case 'CAP_DEFAULT': return { ...s, caps: { ...s.caps, def: Math.max(0, a.n) } }
    case 'CAP_SLOT': {
      const overrides = { ...s.caps.overrides }
      if (a.cap == null) delete overrides[a.slot]; else overrides[a.slot] = Math.max(0, a.cap)
      return { ...s, caps: { ...s.caps, overrides } }
    }
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
    case 'SYNC_COMBOS': {
      return { ...s, combos: a.combos || [] }
    }
    case 'COMBO_SAVE': {
      const exists = s.combos.some((x) => x.id === a.combo.id)
      const combos = exists ? s.combos.map((x) => x.id === a.combo.id ? { ...x, ...a.combo } : x) : [...s.combos, a.combo]
      return { ...s, combos }
    }
    case 'COMBO_DELETE': {
      return { ...s, combos: s.combos.filter((x) => x.id !== a.id) }
    }
    default: return s
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
  const clock = useClock(state.hours)
  const [authReady, setAuthReady] = useState(false)
  const [altItem, setAltItem] = useState(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [toasts, setToasts] = useState([])
  const ref = useRef(state)
  ref.current = state
  const inFlightStockRef = useRef(new Set())

  // Live Backend Polling (Syncs public menu/combos/slots, plus scoped student & staff orders every 2s)
  const pollBackend = useCallback(async () => {
    try {
      const hasStudent = Boolean(ref.current.user)
      const hasStaff = Boolean(ref.current.staffUser)
      const [remoteMenu, remoteCombos, remoteSlots, remoteStudentOrders, remoteStaffOrders, insights] = await Promise.all([
        api.getMenu().catch(() => null),
        api.getCombos().catch(() => null),
        api.getSlots().catch(() => null),
        hasStudent ? api.getStudentOrders().catch(() => null) : Promise.resolve(null),
        hasStaff ? api.getStaffOrders().catch(() => null) : Promise.resolve(null),
        hasStaff ? api.getDemandInsights('week').catch(() => null) : Promise.resolve(null),
      ])
      if (remoteMenu && Array.isArray(remoteMenu)) {
        const pendingIds = inFlightStockRef.current
        const mergedMenu = pendingIds.size > 0
          ? remoteMenu.map((rm) => {
              if (!pendingIds.has(rm.id)) return rm
              const local = ref.current.menu.find((x) => x.id === rm.id)
              return local ? { ...rm, stock: local.stock, available: local.available } : rm
            })
          : remoteMenu
        dispatch({ type: 'SYNC_MENU', menu: mergedMenu })
      }
      if (remoteCombos && Array.isArray(remoteCombos)) {
        dispatch({ type: 'SYNC_COMBOS', combos: remoteCombos })
      }
      if (remoteSlots && (remoteSlots.caps || remoteSlots.hours)) {
        dispatch({
          type: 'SYNC_SLOTS',
          caps: remoteSlots.caps,
          hours: remoteSlots.hours,
          slotCounts: remoteSlots.slotCounts,
          activeBySlot: remoteSlots.activeBySlot,
          activeUnits: remoteSlots.activeUnits,
        })
      }
      if (hasStudent && remoteStudentOrders && Array.isArray(remoteStudentOrders)) {
        dispatch({ type: 'SYNC_STUDENT_ORDERS', orders: remoteStudentOrders })
      }
      if (hasStaff && remoteStaffOrders && Array.isArray(remoteStaffOrders)) {
        dispatch({ type: 'SYNC_ORDERS', orders: remoteStaffOrders })
      }
      if (hasStaff && insights && Array.isArray(insights.missed)) {
        dispatch({ type: 'SYNC_MISSED', missed: insights.missed })
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

  // Bootstrap access tokens on page load/refresh using stored refresh tokens (logs out if expired/revoked)
  useEffect(() => {
    let active = true
    setAuthFailureHandler((scope) => {
      if (!active) return
      if (scope === 'staff') {
        dispatch({ type: 'STAFF_SET', user: null })
      } else {
        dispatch({ type: 'USER_SET', user: null })
        dispatch({ type: 'CART_CLEAR' })
        setCartOpen(false)
      }
      toast('Session expired — please sign in again', 'warn')
    })

    ;(async () => {
      const hasStudent = Boolean(getSavedSession('student'))
      const hasStaff = Boolean(getSavedSession('staff'))
      const [studentRes, staffRes] = await Promise.all([
        hasStudent ? refreshScope('student') : Promise.resolve(null),
        hasStaff ? refreshScope('staff') : Promise.resolve(null),
      ])
      if (!active) return

      if (studentRes?.user) {
        dispatch({ type: 'USER_SET', user: studentRes.user })
      } else if (hasStudent) {
        clearSession('student')
        dispatch({ type: 'USER_SET', user: null })
        dispatch({ type: 'CART_CLEAR' })
      }

      if (staffRes?.user && staffRes.user.role === 'staff') {
        dispatch({ type: 'STAFF_SET', user: staffRes.user })
      } else if (hasStaff) {
        clearSession('staff')
        dispatch({ type: 'STAFF_SET', user: null })
      }

      setAuthReady(true)
    })()

    return () => { active = false }
  }, [toast])

  const logMissed = useCallback(({ item, qty, alt = null, reason = 'sold-out' }) => {
    const c = readClock(ref.current.hours)
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

    // Shelf-stock limit is enforced at checkout (pre-orders are exempt); here only cap sanity
    if (qty > 200) {
      toast('Maximum 200 per item', 'warn')
      return
    }

    dispatch({ type: 'CART_SET', id: item.id, qty })
  }, [toast, logMissed])

  const addCombo = useCallback((combo) => {
    const target = combo || ref.current.combos.find((c) => c.active !== false)
    if (!target || !Array.isArray(target.items) || !target.items.length) return
    const menu = ref.current.menu
    const blocked = target.items.map((c) => menu.find((x) => x.id === c.id)).find((it) => !it || !isEffAvail(it))
    if (blocked) { setAltItem(blocked); return }
    target.items.forEach((c) => dispatch({ type: 'CART_SET', id: c.id, qty: (ref.current.cart[c.id] || 0) + (c.qty || 1) }))
    toast(`${target.name} added — combo savings applied automatically`)
  }, [toast])

  const placeOrder = useCallback(async ({ slot, payment }) => {
    const s = ref.current
    if (!s.user) return { ok: false, error: 'Please sign in to place an order' }
    const nowMin = readClock(s.hours).min
    const sum = cartSummary(s.cart, s.menu, s.combos, slot != null && isPreOrder(slot, nowMin))
    if (!sum.lines.length) return { ok: false, error: 'Your bag is empty' }
    if (sum.hasUnavailable) return { ok: false, error: 'Some items just sold out — remove them to continue' }
    if (slot == null) return { ok: false, error: 'Pick a pickup slot' }
    const st = slotStats(slot, s.orders, s.caps, s.slotCounts)
    if (st.state === 'full') return { ok: false, error: 'That slot just filled up — pick another' }

    const items = sum.lines.map((l) => ({ id: l.item.id, name: l.item.name, price: l.item.price, qty: l.qty }))
    const requiresApproval = needsApproval(items, slot, nowMin, s.menu)
    const cook = cookMinutes(items, s.menu)
    const status = requiresApproval ? 'pending_approval' : 'preparing'

    const orderPayload = {
      id: genOrderId(s.studentOrders),
      name: s.user.username,
      rollNo: s.user.rollNo,
      usernameKey: s.user.username.toLowerCase(),
      phone: s.user.phone,
      slot,
      nowMin,
      payment,
      items,
      total: sum.total,
      discount: sum.discount,
      createdAt: Date.now(),
      status,
      requiresApproval,
      isPreOrderRequest: requiresApproval,
      exceedsStock: exceedsStock(items, s.menu),
      cookMinutes: cook,
      suggestedSlot: earliestSlot(nowMin, cook),
      isPreOrder: isPreOrder(slot, nowMin),
      approvalDeadline: requiresApproval ? Date.now() + APPROVAL.waitMin * 60000 : null,
      history: [{ status, at: Date.now() }],
      day: 0,
    }

    try {
      const savedOrder = await api.placeOrder(orderPayload)
      dispatch({ type: 'PLACE', order: savedOrder, min: nowMin })
      return { ok: true, order: savedOrder }
    } catch (err) {
      if (err.status === 409 && err.data?.code === 'STOCK_CONFLICT') {
        if (Array.isArray(err.data.menu)) {
          dispatch({ type: 'SYNC_MENU', menu: err.data.menu })
        }
        return {
          ok: false,
          error: err.data.error,
          conflictItemId: err.data.itemId,
          availableStock: err.data.availableStock,
        }
      }
      return { ok: false, error: err.message || 'Could not reach server — try again' }
    }
  }, [])

  const setStatus = useCallback((id, status) => {
    dispatch({ type: 'STATUS', id, status })
    api.updateOrderStatus(id, status).catch(() => {})
  }, [])

  // OWNER: approve | reject | counter (propose a new slot) for a large order
  const decideOrder = useCallback(async (id, action, slot) => {
    try {
      const updated = await api.decideOrder(id, action, slot)
      dispatch({ type: 'ORDER_PATCH', id, patch: updated })
      pollBackend()
      return true
    } catch {
      toast('Could not reach server — try again', 'warn')
      return false
    }
  }, [toast, pollBackend])

  // STUDENT: accept or decline the owner's counter-offer
  const respondToOffer = useCallback(async (id, accept) => {
    try {
      const updated = await api.respondToOffer(id, accept)
      dispatch({ type: 'ORDER_PATCH', id, patch: updated })
    } catch {
      toast('Could not reach server — try again', 'warn')
    }
  }, [toast])

  // STUDENT: request cancellation (instant for pending approvals, owner-approved for preparing/confirmed orders within cutoff)
  const requestCancel = useCallback(async (id, phone) => {
    try {
      const updated = await api.requestCancel(id, phone || ref.current.user?.phone || '', readClock(ref.current.hours).min)
      dispatch({ type: 'ORDER_PATCH', id, patch: updated })
      toast(updated.status === 'cancelled' ? 'Order request cancelled' : 'Cancellation request sent to manager', updated.status === 'cancelled' ? 'ok' : 'warn')
      return { ok: true, order: updated }
    } catch (err) {
      toast(err.message || 'Could not request cancellation', 'warn')
      return { ok: false, error: err.message }
    }
  }, [toast])

  // OWNER: approve or reject a cancellation request (and refresh menu stock if restored)
  const decideCancel = useCallback(async (id, action) => {
    try {
      const updated = await api.decideCancel(id, action)
      dispatch({ type: 'ORDER_PATCH', id, patch: updated })
      pollBackend()
      return true
    } catch {
      toast('Could not reach server — try again', 'warn')
      return false
    }
  }, [toast, pollBackend])

  // OWNER INVENTORY PERSISTENCE: Syncs directly to Backend Database!
  const setStock = useCallback(async (id, newStock) => {
    const safeStock = Math.max(0, Math.floor(Number(newStock) || 0))
    dispatch({ type: 'STOCK_SET', id, stock: safeStock })
    const targetItem = ref.current.menu.find((m) => m.id === id)
    if (!targetItem) return false
    inFlightStockRef.current.add(id)
    try {
      await api.saveMenuItem({ ...targetItem, stock: safeStock, available: safeStock > 0 })
      return true
    } catch (err) {
      toast(err.message || 'Could not save stock update', 'warn')
      pollBackend()
      return false
    } finally {
      inFlightStockRef.current.delete(id)
    }
  }, [toast, pollBackend])

  // OWNER MENU MANAGER PERSISTENCE
  const saveMenuItem = useCallback((item) => {
    dispatch({ type: 'MENU_SAVE', item })
    api.saveMenuItem(item).catch(() => {})
  }, [])

  const deleteMenuItem = useCallback((id) => {
    dispatch({ type: 'MENU_DELETE', id })
    api.deleteMenuItem(id).catch(() => {})
  }, [])

  const saveCombo = useCallback(async (combo) => {
    try {
      const res = await api.saveCombo(combo)
      const saved = res?.combo || combo
      dispatch({ type: 'COMBO_SAVE', combo: saved })
      return { ok: true, combo: saved }
    } catch (err) {
      return { ok: false, error: err.message || 'Failed to save combo' }
    }
  }, [])

  const deleteCombo = useCallback(async (id) => {
    dispatch({ type: 'COMBO_DELETE', id })
    api.deleteCombo(id).catch(() => {})
  }, [])

  const setHours = useCallback((open, close) => {
    dispatch({ type: 'HOURS_SET', open, close })
    const s = ref.current
    api.saveSlotSettings({ open, close, def: s.caps.def, overrides: s.caps.overrides }).catch(() => {})
  }, [])

  const setCapDefault = useCallback((n) => {
    const val = Math.max(0, n)
    dispatch({ type: 'CAP_DEFAULT', n: val })
    const s = ref.current
    api.saveSlotSettings({ open: s.hours.open, close: s.hours.close, def: val, overrides: s.caps.overrides }).catch(() => {})
  }, [])

  const setCapSlot = useCallback((slot, cap) => {
    dispatch({ type: 'CAP_SLOT', slot, cap })
    const s = ref.current
    const overrides = { ...s.caps.overrides }
    if (cap == null) delete overrides[slot]; else overrides[slot] = Math.max(0, cap)
    api.saveSlotSettings({ open: s.hours.open, close: s.hours.close, def: s.caps.def, overrides }).catch(() => {})
  }, [])

  const registerStudent = useCallback(async (username, password, phone) => {
    try {
      const res = await api.registerStudent(username, password, phone)
      setSession('student', res)
      dispatch({ type: 'CART_CLEAR' })
      dispatch({ type: 'USER_SET', user: res.user })
      ref.current = { ...ref.current, user: res.user }
      pollBackend()
      toast(`Account created — welcome, ${res.user.username}!`, 'ok')
      return { ok: true, user: res.user }
    } catch (err) {
      return { ok: false, error: err.message || 'Sign up failed', code: err.data?.code }
    }
  }, [toast, pollBackend])

  const loginStudent = useCallback(async (username, password) => {
    try {
      const res = await api.loginStudent(username, password)
      setSession('student', res)
      dispatch({ type: 'CART_CLEAR' })
      dispatch({ type: 'USER_SET', user: res.user })
      ref.current = { ...ref.current, user: res.user }
      pollBackend()
      toast(`Welcome back, ${res.user.username}!`, 'ok')
      return { ok: true, user: res.user }
    } catch (err) {
      return { ok: false, error: err.message || 'Sign in failed', code: err.data?.code }
    }
  }, [toast, pollBackend])

  const logoutStudent = useCallback(() => {
    api.logout('student').catch(() => {})
    clearSession('student')
    dispatch({ type: 'USER_SET', user: null })
    dispatch({ type: 'CART_CLEAR' })
    setCartOpen(false)
    toast('Signed out', 'ok')
  }, [toast])

  const loginStaff = useCallback(async (username, password) => {
    try {
      const res = await api.loginStaff(username, password)
      setSession('staff', res)
      dispatch({ type: 'STAFF_SET', user: res.user })
      ref.current = { ...ref.current, staffUser: res.user }
      pollBackend()
      toast(`Signed in to Staff Portal (${res.user.username})`, 'ok')
      return { ok: true, user: res.user }
    } catch (err) {
      return { ok: false, error: err.message || 'Staff sign in failed', code: err.data?.code }
    }
  }, [toast, pollBackend])

  const logoutStaff = useCallback(() => {
    api.logout('staff').catch(() => {})
    clearSession('staff')
    dispatch({ type: 'STAFF_SET', user: null })
    toast('Signed out of Kitchen & Owner portal', 'ok')
  }, [toast])

  const updateStaffProfile = useCallback(async (profile) => {
    try {
      const res = await api.updateStaffProfile(profile)
      if (res?.user) {
        dispatch({ type: 'STAFF_SET', user: res.user })
        updateSavedUser('staff', res.user)
      }
      toast('Owner profile updated', 'ok')
      return { ok: true, user: res.user }
    } catch (err) {
      return { ok: false, error: err.message || 'Could not update profile' }
    }
  }, [toast])

  const changeStaffPassword = useCallback(async (currentPassword, newPassword) => {
    try {
      const res = await api.changeStaffPassword(currentPassword, newPassword)
      setSession('staff', res)
      if (res?.user) dispatch({ type: 'STAFF_SET', user: res.user })
      toast('Staff password updated securely', 'ok')
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message || 'Could not update password' }
    }
  }, [toast])

  const resetDemo = useCallback(async () => {
    try {
      await api.resetDemo()
    } catch {}
    dispatch({ type: 'SYNC_ORDERS', orders: [] })
    dispatch({ type: 'SYNC_STUDENT_ORDERS', orders: [] })
    toast('Orders cleared & database reset')
  }, [toast])

  const value = useMemo(() => ({
    state, dispatch, clock, now: clock.min, toast, toasts, authReady,
    altItem, setAltItem, cartOpen, setCartOpen,
    setQty, addCombo, placeOrder, setStatus, logMissed, resetDemo, decideOrder, respondToOffer, requestCancel, decideCancel,
    setStock, saveMenuItem, deleteMenuItem, saveCombo, deleteCombo, setHours, setCapDefault, setCapSlot,
    registerStudent, loginStudent, logoutStudent, logoutUser: logoutStudent, loginStaff, logoutStaff,
    updateStaffProfile, changeStaffPassword,
    slot: (sl) => slotStats(sl, state.orders, state.caps, state.slotCounts),
    cart: state.cart, menu: state.menu, combos: state.combos,
    orders: state.orders, studentOrders: state.studentOrders,
    slotCounts: state.slotCounts, activeBySlot: state.activeBySlot, activeUnits: state.activeUnits,
    hours: state.hours, user: state.user, staffUser: state.staffUser,
  }), [state, clock, toasts, authReady, altItem, cartOpen, setQty, addCombo, placeOrder, setStatus, logMissed, resetDemo, decideOrder, respondToOffer, requestCancel, decideCancel, setStock, saveMenuItem, deleteMenuItem, saveCombo, deleteCombo, setHours, setCapDefault, setCapSlot, registerStudent, loginStudent, logoutStudent, loginStaff, logoutStaff, updateStaffProfile, changeStaffPassword, toast])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
