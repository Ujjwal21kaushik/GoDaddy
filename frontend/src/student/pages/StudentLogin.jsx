import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, KeyRound, LogOut, Phone, User, UserPlus, Zap } from 'lucide-react'
import { useApp } from '../../store/AppContext.jsx'

export default function StudentLogin() {
  const { user, loginStudent, registerStudent, logoutStudent } = useApp()
  const nav = useNavigate()
  const loc = useLocation()

  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [suggestSignup, setSuggestSignup] = useState(false)

  const switchMode = (next) => {
    setMode(next)
    setErr('')
    setSuggestSignup(false)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setErr('')
    setSuggestSignup(false)

    const u = username.trim()
    const p = password.trim()
    const ph = phone.trim()

    if (u.length < 2 || p.length < 2) {
      setErr('Enter your username and password (at least 2 characters each).')
      return
    }

    if (mode === 'signup' && !/^\d{10}$/.test(ph)) {
      setErr('Enter a valid 10-digit phone number (used for pre-order & cancellation updates).')
      return
    }

    setBusy(true)
    const r = mode === 'signup'
      ? await registerStudent(u, p, ph)
      : await loginStudent(u, p)
    setBusy(false)

    if (!r.ok) {
      setErr(r.error)
      if (mode === 'login' && r.code === 'USER_NOT_FOUND') {
        setSuggestSignup(true)
      }
      return
    }

    const from = loc.state?.from
    const target = from && !from.startsWith('/kitchen') && !from.startsWith('/owner') ? from : '/'
    nav(target, { replace: true })
  }

  if (user) {
    return (
      <div className="page narrow">
        <div className="card" style={{ padding: 28 }}>
          <div className="row between" style={{ marginBottom: 16 }}>
            <span className="empty-code">SIGNED IN</span>
            <span className="tag green">SESSION ACTIVE</span>
          </div>
          <h1 className="h1" style={{ fontSize: 24, marginBottom: 6 }}>Welcome back, {user.username}</h1>
          <p className="muted" style={{ marginBottom: 18 }}>
            Phone: <b className="mono" style={{ color: 'var(--ink)' }}>{user.phone || '—'}</b>
          </p>
          <div className="row">
            <Link to="/" className="btn-primary accent grow">
              Go to Menu <ArrowRight size={14} />
            </Link>
            <button className="btn-ghost" onClick={logoutStudent}>
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page narrow">
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ background: 'var(--ink)', color: '#FFFFFF', padding: '24px 26px', borderBottom: '1px solid var(--ink)' }}>
          <div className="hero-kicker" style={{ marginBottom: 8 }}>
            <Zap size={13} fill="currentColor" /> STUDENT PORTAL
          </div>
          <h1 style={{ fontSize: 26, color: '#FFFFFF' }}>
            {mode === 'login' ? 'Sign in to OrderQuick' : 'Create Student Account'}
          </h1>
          <p style={{ color: '#A1A1AA', fontSize: 13, marginTop: 6 }}>
            {mode === 'login'
              ? 'Returning student? Sign in with your username and password.'
              : 'First time here? Register once with your username, password, and 10-digit phone number.'}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border, #E4E4E7)' }}>
          <button
            type="button"
            onClick={() => switchMode('login')}
            style={{
              padding: '12px 14px',
              border: 0,
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 13,
              background: mode === 'login' ? '#FFFFFF' : '#F4F4F0',
              color: mode === 'login' ? '#09090B' : '#71717A',
              borderBottom: mode === 'login' ? '2px solid #FF3B1D' : '2px solid transparent',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            style={{
              padding: '12px 14px',
              border: 0,
              borderLeft: '1px solid var(--border, #E4E4E7)',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 13,
              background: mode === 'signup' ? '#FFFFFF' : '#F4F4F0',
              color: mode === 'signup' ? '#09090B' : '#71717A',
              borderBottom: mode === 'signup' ? '2px solid #FF3B1D' : '2px solid transparent',
            }}
          >
            First-Time Sign Up
          </button>
        </div>

        <form className="form" onSubmit={submit} style={{ padding: 26 }}>
          <label>
            <span className="row" style={{ gap: 5 }}><User size={13} /> Username</span>
            <input
              className="input"
              placeholder="e.g. aarav"
              value={username}
              maxLength={40}
              autoComplete="username"
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>

          <label>
            <span className="row" style={{ gap: 5 }}><KeyRound size={13} /> Password</span>
            <div style={{ position: 'relative' }}>
              <input
                className="input mono"
                type={showPass ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                maxLength={64}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                style={{ paddingRight: 40 }}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="icon-btn"
                aria-label={showPass ? 'Hide password' : 'Show password'}
                onClick={() => setShowPass((v) => !v)}
                style={{ position: 'absolute', right: 4, top: 4, width: 30, height: 30, border: 0 }}
              >
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </label>

          {mode === 'signup' && (
            <label>
              <span className="row" style={{ gap: 5 }}><Phone size={13} /> Phone Number (10 digits)</span>
              <input
                className="input mono"
                placeholder="e.g. 9876543210"
                value={phone}
                inputMode="numeric"
                maxLength={10}
                autoComplete="tel"
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              />
              <small>Asked once during registration for pre-order approvals &amp; cancellation alerts.</small>
            </label>
          )}

          {err && (
            <div className="err">
              <div>{err}</div>
              {suggestSignup && (
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ marginTop: 8, width: '100%', fontSize: 12 }}
                  onClick={() => switchMode('signup')}
                >
                  <UserPlus size={13} /> Switch to First-Time Sign Up &rarr;
                </button>
              )}
            </div>
          )}

          <button type="submit" className="btn-primary accent full lg" disabled={busy} style={{ marginTop: 4 }}>
            {busy
              ? (mode === 'signup' ? 'Creating Account…' : 'Signing In…')
              : (mode === 'signup' ? 'Create Account & Continue' : 'Sign In & Continue')}
            <ArrowRight size={15} />
          </button>
        </form>
      </div>
    </div>
  )
}
