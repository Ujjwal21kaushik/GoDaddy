// API integration seam. Connects to backend at http://localhost:5000
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const STUDENT_REFRESH_KEY = 'orderquick:student:refresh:v1'
const STAFF_REFRESH_KEY = 'orderquick:staff:refresh:v1'

// Remove legacy single-token storage key if present
try {
  localStorage.removeItem('orderquick:user:v1')
} catch {}

// Short-lived Access Tokens live strictly in memory (never in localStorage)
const accessTokens = { student: '', staff: '' }
const refreshPromises = { student: null, staff: null }
let authFailureHandler = null

export function setAuthFailureHandler(fn) {
  authFailureHandler = fn
}

function keyForScope(scope) {
  return scope === 'staff' ? STAFF_REFRESH_KEY : STUDENT_REFRESH_KEY
}

export function getSavedSession(scope = 'student') {
  try {
    const raw = localStorage.getItem(keyForScope(scope))
    const parsed = raw ? JSON.parse(raw) : null
    if (parsed && parsed.refreshToken && parsed.user) return parsed
    return null
  } catch {
    return null
  }
}

export function setSession(scope, data) {
  if (!data) return
  if (data.accessToken) {
    accessTokens[scope] = data.accessToken
  }
  if (data.refreshToken && data.user) {
    try {
      localStorage.setItem(
        keyForScope(scope),
        JSON.stringify({ refreshToken: data.refreshToken, user: data.user })
      )
    } catch {}
  }
}

export function clearSession(scope) {
  accessTokens[scope] = ''
  try {
    localStorage.removeItem(keyForScope(scope))
  } catch {}
}

export function updateSavedUser(scope, user) {
  if (!user) return
  try {
    const saved = getSavedSession(scope)
    if (saved?.refreshToken) {
      localStorage.setItem(
        keyForScope(scope),
        JSON.stringify({ refreshToken: saved.refreshToken, user })
      )
    }
  } catch {}
}

export async function refreshScope(scope = 'student') {
  if (refreshPromises[scope]) return refreshPromises[scope]

  const saved = getSavedSession(scope)
  if (!saved?.refreshToken) {
    clearSession(scope)
    return null
  }

  refreshPromises[scope] = (async () => {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: saved.refreshToken }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok || !body?.accessToken) {
        if (res.status === 401) {
          clearSession(scope)
          authFailureHandler?.(scope)
        }
        return null
      }
      setSession(scope, body)
      return body
    } catch {
      return null
    } finally {
      refreshPromises[scope] = null
    }
  })()

  return refreshPromises[scope]
}

async function request(path, options = {}, scope = 'public', _retried = false) {
  const token = scope !== 'public' ? accessTokens[scope] : ''
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  try {
    const res = await fetch(`${BASE}${path}`, { ...options, headers })
    const body = await res.json().catch(() => null)

    if (!res.ok) {
      if (res.status === 401 && !_retried && scope !== 'public') {
        const refreshed = await refreshScope(scope)
        if (refreshed?.accessToken) {
          return request(path, options, scope, true)
        }
      }
      const err = new Error(body?.error || `API ${res.status}`)
      err.status = res.status
      err.data = body
      throw err
    }
    return body
  } catch (err) {
    console.warn(`[OrderQuick API] ${BASE}${path} failed:`, err.message)
    throw err
  }
}

export const api = {
  // Auth (public)
  registerStudent: (username, password, phone) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ username, password, phone }) }, 'public'),
  loginStudent: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }, 'public'),
  loginStaff: (username, password) =>
    request('/auth/staff/login', { method: 'POST', body: JSON.stringify({ username, password }) }, 'public'),
  refreshToken: (refreshToken) =>
    request('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }, 'public'),
  logout: (scope = 'student') => {
    const saved = getSavedSession(scope)
    return request('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: saved?.refreshToken || '' }),
    }, scope === 'staff' ? 'staff' : 'student')
  },

  // Public reads / telemetry
  getMenu: () => request('/menu', {}, 'public'),
  getCombos: () => request('/combos', {}, 'public'),
  getSlots: () => request('/slots', {}, 'public'),
  logMissedDemand: (rec) => request('/demand/missed', { method: 'POST', body: JSON.stringify(rec) }, 'public'),

  // Student-authenticated reads & writes (strictly scoped to signed-in student)
  getStudentOrders: () => request('/orders', {}, 'student'),
  placeOrder: (order) => request('/orders', { method: 'POST', body: JSON.stringify(order) }, 'student'),
  respondToOffer: (id, accept) => request(`/orders/${id}/respond`, { method: 'POST', body: JSON.stringify({ accept }) }, 'student'),
  requestCancel: (id, phone, now) => request(`/orders/${id}/cancel-request`, { method: 'POST', body: JSON.stringify({ phone, now }) }, 'student'),

  // Staff-authenticated (Kitchen & Owner) reads & writes
  getStaffOrders: () => request('/orders', {}, 'staff'),
  getDemandInsights: (range) => request(`/demand/insights?range=${range}`, {}, 'staff'),
  saveMenuItem: (item) => request('/menu', { method: 'POST', body: JSON.stringify(item) }, 'staff'),
  deleteMenuItem: (id) => request(`/menu/${id}`, { method: 'DELETE' }, 'staff'),
  saveCombo: (combo) => request('/combos', { method: 'POST', body: JSON.stringify(combo) }, 'staff'),
  deleteCombo: (id) => request(`/combos/${id}`, { method: 'DELETE' }, 'staff'),
  saveSlotSettings: (settings) => request('/slots/settings', { method: 'PUT', body: JSON.stringify(settings) }, 'staff'),
  decideOrder: (id, action, slot) => request(`/orders/${id}/decision`, { method: 'POST', body: JSON.stringify({ action, slot }) }, 'staff'),
  decideCancel: (id, action) => request(`/orders/${id}/cancel-decision`, { method: 'POST', body: JSON.stringify({ action }) }, 'staff'),
  updateOrderStatus: (id, status) => request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, 'staff'),
  resetDemo: () => request('/demo/reset', { method: 'POST' }, 'staff'),
  getStaffProfile: () => request('/auth/staff/profile', {}, 'staff'),
  updateStaffProfile: (profile) => request('/auth/staff/profile', { method: 'PUT', body: JSON.stringify(profile) }, 'staff'),
  changeStaffPassword: (currentPassword, newPassword) =>
    request('/auth/staff/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) }, 'staff'),
}
