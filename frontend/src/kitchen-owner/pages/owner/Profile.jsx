import { useEffect, useState } from 'react'
import { Building2, Check, Eye, EyeOff, KeyRound, Mail, MapPin, Phone, ShieldCheck, User, Wallet } from 'lucide-react'
import { useApp } from '../../../store/AppContext.jsx'
import { api } from '../../../services/api.js'

function pickProfile(u) {
  return {
    fullName: u?.fullName || '',
    phone: u?.phone && u.phone !== '0000000000' ? u.phone : '',
    email: u?.email || '',
    canteenName: u?.canteenName || '',
    counterLocation: u?.counterLocation || '',
    upiId: u?.upiId || '',
    bio: u?.bio || '',
  }
}

export default function Profile() {
  const { staffUser, updateStaffProfile, changeStaffPassword } = useApp()
  const [form, setForm] = useState(() => pickProfile(staffUser))
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileErr, setProfileErr] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCur, setShowCur] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [savingPass, setSavingPass] = useState(false)
  const [passErr, setPassErr] = useState('')

  useEffect(() => {
    let active = true
    api.getStaffProfile()
      .then((res) => {
        if (active && res?.user) setForm(pickProfile(res.user))
      })
      .catch(() => {})
    return () => { active = false }
  }, [])

  const setField = (k, v) => setForm((prev) => ({ ...prev, [k]: v }))

  const submitProfile = async (e) => {
    e.preventDefault()
    if (savingProfile) return
    setProfileErr('')

    const phone = form.phone.trim()
    const email = form.email.trim()
    if (phone && !/^\d{10}$/.test(phone)) {
      setProfileErr('Enter a valid 10-digit phone number.')
      return
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setProfileErr('Enter a valid email address.')
      return
    }

    setSavingProfile(true)
    const r = await updateStaffProfile({
      fullName: form.fullName.trim(),
      phone,
      email,
      canteenName: form.canteenName.trim(),
      counterLocation: form.counterLocation.trim(),
      upiId: form.upiId.trim(),
      bio: form.bio.trim(),
    })
    setSavingProfile(false)

    if (!r.ok) {
      setProfileErr(r.error || 'Could not update profile')
    } else if (r.user) {
      setForm(pickProfile(r.user))
    }
  }

  const submitPassword = async (e) => {
    e.preventDefault()
    if (savingPass) return
    setPassErr('')

    if (!currentPassword || !newPassword) {
      setPassErr('Enter both your current password and a new password.')
      return
    }
    if (newPassword.length < 6) {
      setPassErr('New password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPassErr('New password and confirmation do not match.')
      return
    }

    setSavingPass(true)
    const r = await changeStaffPassword(currentPassword, newPassword)
    setSavingPass(false)

    if (!r.ok) {
      setPassErr(r.error || 'Could not update password')
      return
    }
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  return (
    <div className="stack">
      <div
        style={{
          background: 'var(--ink, #09090B)',
          color: '#FFFFFF',
          borderRadius: 8,
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--lime, #D4FF00)', letterSpacing: '0.06em' }}>
            <ShieldCheck size={13} /> KITCHEN &amp; OWNER ACCOUNT
          </div>
          <h3 style={{ color: '#FFFFFF', margin: '6px 0 4px', fontSize: 22 }}>
            {form.fullName || staffUser?.username || 'Owner Profile'}
          </h3>
          <p style={{ color: '#A1A1AA', margin: 0, fontSize: 13 }}>
            Staff ID: <b className="mono" style={{ color: '#FFFFFF' }}>{staffUser?.username || '—'}</b>
            {form.canteenName ? ` · ${form.canteenName}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="tag green">MONGODB SYNCED</span>
          {staffUser?.lastLoginAt && (
            <span className="tag" style={{ background: '#27272A', color: '#E4E4E7' }}>
              Last login: {new Date(staffUser.lastLoginAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', alignItems: 'start' }}>
        {/* OWNER DETAILS FORM */}
        <form
          onSubmit={submitProfile}
          className="form"
          style={{ background: '#FFFFFF', border: '1px solid #E4E4E7', borderRadius: 8, padding: 20 }}
        >
          <div>
            <h4 style={{ margin: '0 0 4px', fontSize: 16 }}>Owner &amp; Canteen Profile</h4>
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              Stored securely in MongoDB (<span className="mono">quickorder.users</span>).
            </p>
          </div>

          <div className="f-row">
            <label>
              <span className="row" style={{ gap: 5 }}><User size={13} /> Full Name</span>
              <input
                className="input"
                placeholder="e.g. Ujjwal Kaushik"
                value={form.fullName}
                maxLength={80}
                onChange={(e) => setField('fullName', e.target.value)}
              />
            </label>
            <label>
              <span className="row" style={{ gap: 5 }}><Phone size={13} /> Phone Number (10 digits)</span>
              <input
                className="input mono"
                placeholder="e.g. 9876543210"
                inputMode="numeric"
                maxLength={10}
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value.replace(/\D/g, ''))}
              />
            </label>
          </div>

          <div className="f-row">
            <label>
              <span className="row" style={{ gap: 5 }}><Mail size={13} /> Email Address</span>
              <input
                className="input"
                type="email"
                placeholder="e.g. owner@campus.edu"
                value={form.email}
                maxLength={100}
                onChange={(e) => setField('email', e.target.value)}
              />
            </label>
            <label>
              <span className="row" style={{ gap: 5 }}><Wallet size={13} /> UPI ID (for settlement ref)</span>
              <input
                className="input mono"
                placeholder="e.g. canteen@upi"
                value={form.upiId}
                maxLength={80}
                onChange={(e) => setField('upiId', e.target.value)}
              />
            </label>
          </div>

          <div className="f-row">
            <label>
              <span className="row" style={{ gap: 5 }}><Building2 size={13} /> Canteen Name</span>
              <input
                className="input"
                placeholder="e.g. Main Campus Canteen"
                value={form.canteenName}
                maxLength={100}
                onChange={(e) => setField('canteenName', e.target.value)}
              />
            </label>
            <label>
              <span className="row" style={{ gap: 5 }}><MapPin size={13} /> Counter Location</span>
              <input
                className="input"
                placeholder="e.g. Academic Block Ground Floor"
                value={form.counterLocation}
                maxLength={120}
                onChange={(e) => setField('counterLocation', e.target.value)}
              />
            </label>
          </div>

          <label>
            <span>Owner Note / Canteen Bio</span>
            <textarea
              className="input"
              rows={3}
              placeholder="e.g. Fresh snacks & hot meals — pickup counter #1"
              maxLength={240}
              value={form.bio}
              onChange={(e) => setField('bio', e.target.value)}
              style={{ resize: 'vertical', height: 'auto', paddingTop: 8, paddingBottom: 8 }}
            />
          </label>

          {profileErr && <div className="err">{profileErr}</div>}

          <div className="row end">
            <button type="submit" className="btn-primary accent" disabled={savingProfile}>
              <Check size={14} /> {savingProfile ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        </form>

        {/* CHANGE STAFF PASSWORD */}
        <form
          onSubmit={submitPassword}
          className="form"
          style={{ background: '#FFFFFF', border: '1px solid #E4E4E7', borderRadius: 8, padding: 20 }}
        >
          <div>
            <h4 style={{ margin: '0 0 4px', fontSize: 16 }}>Security &amp; Password</h4>
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              Update the shared password for both <span className="mono">/kitchen</span> and <span className="mono">/owner</span>. Stored salted &amp; hashed in MongoDB.
            </p>
          </div>

          <label>
            <span className="row" style={{ gap: 5 }}><KeyRound size={13} /> Current Password</span>
            <div style={{ position: 'relative' }}>
              <input
                className="input mono"
                type={showCur ? 'text' : 'password'}
                placeholder="Enter current password"
                value={currentPassword}
                autoComplete="current-password"
                style={{ paddingRight: 40 }}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <button
                type="button"
                className="icon-btn"
                aria-label={showCur ? 'Hide current password' : 'Show current password'}
                onClick={() => setShowCur((v) => !v)}
                style={{ position: 'absolute', right: 4, top: 4, width: 30, height: 30, border: 0 }}
              >
                {showCur ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </label>

          <label>
            <span className="row" style={{ gap: 5 }}><KeyRound size={13} /> New Password (min 6 chars)</span>
            <div style={{ position: 'relative' }}>
              <input
                className="input mono"
                type={showNew ? 'text' : 'password'}
                placeholder="Enter new password"
                value={newPassword}
                autoComplete="new-password"
                style={{ paddingRight: 40 }}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                className="icon-btn"
                aria-label={showNew ? 'Hide new password' : 'Show new password'}
                onClick={() => setShowNew((v) => !v)}
                style={{ position: 'absolute', right: 4, top: 4, width: 30, height: 30, border: 0 }}
              >
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </label>

          <label>
            <span className="row" style={{ gap: 5 }}><KeyRound size={13} /> Confirm New Password</span>
            <input
              className="input mono"
              type={showNew ? 'text' : 'password'}
              placeholder="Re-enter new password"
              value={confirmPassword}
              autoComplete="new-password"
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>

          {passErr && <div className="err">{passErr}</div>}

          <div className="row end">
            <button type="submit" className="btn-primary" disabled={savingPass}>
              <KeyRound size={14} /> {savingPass ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
