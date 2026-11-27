import { useState } from 'react'
import { ArrowRight, Eye, EyeOff, KeyRound, ShieldCheck, User, Zap } from 'lucide-react'
import { useApp } from '../../store/AppContext.jsx'

export default function StaffLogin() {
  const { loginStaff, now, clock } = useApp()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setErr('')

    if (!username.trim() || !password.trim()) {
      setErr('Enter your Kitchen / Owner ID and password.')
      return
    }

    setBusy(true)
    const r = await loginStaff(username.trim(), password.trim())
    setBusy(false)

    if (!r.ok) {
      setErr(r.error || 'Invalid Kitchen / Owner credentials.')
    }
  }

  return (
    <>
      <header className="oq-nav">
        <div className="oq-nav-in">
          <div className="oq-brand">
            <span className="oq-mark"><Zap size={15} fill="currentColor" /></span>
            <span>Order<em>Quick</em></span>
            <span className="demo-pill" style={{ marginLeft: 4 }}>STAFF</span>
          </div>
          <div className="oq-right">
            <div className="oq-clock">
              <span>{`${Math.floor(now / 60) % 12 || 12}:${String(now % 60).padStart(2, '0')} ${now >= 720 ? 'PM' : 'AM'}`}</span>
              {clock.demo && <span className="demo-pill">DEMO</span>}
            </div>
          </div>
        </div>
      </header>

      <div className="page narrow">
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ background: 'var(--ink)', color: '#FFFFFF', padding: '24px 26px', borderBottom: '1px solid var(--ink)' }}>
            <div className="hero-kicker" style={{ marginBottom: 8 }}>
              <ShieldCheck size={13} /> KITCHEN &amp; OWNER PORTAL
            </div>
            <h1 style={{ fontSize: 26, color: '#FFFFFF' }}>Staff Sign In Required</h1>
            <p style={{ color: '#A1A1AA', fontSize: 13, marginTop: 6 }}>
              Restricted to authorized canteen kitchen and owner staff only. Sign in with your staff ID and password.
            </p>
          </div>

          <form className="form" onSubmit={submit} style={{ padding: 26 }}>
            <label>
              <span className="row" style={{ gap: 5 }}><User size={13} /> Staff ID</span>
              <input
                className="input"
                placeholder="Enter staff ID"
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
                  placeholder="Enter staff password"
                  value={password}
                  maxLength={64}
                  autoComplete="current-password"
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

            {err && <div className="err">{err}</div>}

            <button type="submit" className="btn-primary accent full lg" disabled={busy} style={{ marginTop: 4 }}>
              {busy ? 'Verifying…' : 'Access Kitchen & Owner Portal'} <ArrowRight size={15} />
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
