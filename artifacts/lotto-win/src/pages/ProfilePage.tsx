import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { useAuth } from '../lib/auth'
import TopNav from '../components/TopNav'
import BottomNav from '../components/BottomNav'
import { formatCurrency } from '../lib/utils'
import OtpInput, { OtpTimer } from '../components/OtpInput'
import { API_BASE } from '../lib/apiBase'
const BASE = API_BASE

type EditSection = 'name' | 'phone' | 'password' | 'totp-setup' | 'totp-disable' | null
type PhoneStep = 'input' | 'otp'

export default function ProfilePage() {
  const [, navigate] = useLocation()
  const { user, token, logout, refresh } = useAuth()
  const [editSection, setEditSection] = useState<EditSection>(null)
  const [name, setName] = useState('')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  // Phone verification state
  const [phoneInput, setPhoneInput] = useState('')
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('input')
  const [phoneOtp, setPhoneOtp] = useState('')
  const [phoneResendKey, setPhoneResendKey] = useState(0)
  const [phoneLoading, setPhoneLoading] = useState(false)

  // TOTP state
  const [totpQr, setTotpQr] = useState<string>('')
  const [totpSecret, setTotpSecret] = useState<string>('')
  const [totpCode, setTotpCode] = useState('')
  const [totpLoading, setTotpLoading] = useState(false)
  const [totpEnabled, setTotpEnabled] = useState(false)

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    setName(user?.full_name || '')
    setPhoneInput((user as any)?.phone || '')
    setTotpEnabled(!!(user as any)?.totp_enabled)
  }, [token, user?.full_name, (user as any)?.phone, (user as any)?.totp_enabled])

  const saveNameOrPassword = async () => {
    setSaving(true); setMsg(null)
    const body: Record<string, string> = {}
    if (editSection === 'name') body.full_name = name
    if (editSection === 'password') { body.current_password = currentPw; body.new_password = newPw }
    const res = await fetch(`${BASE}/api/user/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) { setMsg({ text: data.error || 'Failed', ok: false }) }
    else { await refresh(); setMsg({ text: 'Updated!', ok: true }); setEditSection(null); setCurrentPw(''); setNewPw('') }
    setSaving(false)
  }

  // Phone — step 1: request OTP
  const handlePhoneRequestOtp = async () => {
    if (!phoneInput) { setMsg({ text: 'Enter a phone number', ok: false }); return }
    setPhoneLoading(true); setMsg(null)
    const res = await fetch(`${BASE}/api/user/phone/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ phone: phoneInput }),
    })
    const data = await res.json()
    setPhoneLoading(false)
    if (!res.ok) { setMsg({ text: data.error || 'Failed to send OTP', ok: false }); return }
    setPhoneStep('otp')
    setMsg({ text: 'OTP sent to your email to confirm phone update.', ok: true })
  }

  // Phone — step 2: verify OTP and save
  const handlePhoneVerify = async () => {
    if (phoneOtp.length < 6) { setMsg({ text: 'Enter the 6-digit OTP', ok: false }); return }
    setPhoneLoading(true); setMsg(null)
    const res = await fetch(`${BASE}/api/user/phone/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ phone: phoneInput, otp: phoneOtp }),
    })
    const data = await res.json()
    setPhoneLoading(false)
    if (!res.ok) { setMsg({ text: data.error || 'Verification failed', ok: false }); return }
    await refresh()
    setMsg({ text: '✅ Phone number saved!', ok: true })
    setEditSection(null)
    setPhoneStep('input')
    setPhoneOtp('')
  }

  const handlePhoneResend = async () => {
    setPhoneLoading(true)
    await fetch(`${BASE}/api/user/phone/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ phone: phoneInput }),
    })
    setPhoneLoading(false)
    setPhoneResendKey(k => k + 1)
  }

  const startTotpSetup = async () => {
    setTotpLoading(true); setMsg(null)
    const res = await fetch(`${BASE}/api/totp/setup`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    setTotpLoading(false)
    if (!res.ok) { setMsg({ text: data.error || 'Failed to start 2FA setup', ok: false }); return }
    setTotpQr(data.qr); setTotpSecret(data.secret)
    setEditSection('totp-setup')
  }

  const enableTotp = async () => {
    if (!totpCode || totpCode.length < 6) { setMsg({ text: 'Enter the 6-digit code from your authenticator', ok: false }); return }
    setTotpLoading(true); setMsg(null)
    const res = await fetch(`${BASE}/api/totp/enable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ token: totpCode }),
    })
    const data = await res.json()
    setTotpLoading(false)
    if (!res.ok) { setMsg({ text: data.error || 'Invalid code', ok: false }); return }
    setTotpEnabled(true); setEditSection(null); setTotpCode('')
    setMsg({ text: '2FA enabled! Your account is now extra secure.', ok: true })
    await refresh()
  }

  const disableTotp = async () => {
    if (!totpCode || totpCode.length < 6) { setMsg({ text: 'Enter your authenticator code to disable 2FA', ok: false }); return }
    setTotpLoading(true); setMsg(null)
    const res = await fetch(`${BASE}/api/totp/disable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ token: totpCode }),
    })
    const data = await res.json()
    setTotpLoading(false)
    if (!res.ok) { setMsg({ text: data.error || 'Invalid code', ok: false }); return }
    setTotpEnabled(false); setEditSection(null); setTotpCode('')
    setMsg({ text: '2FA disabled.', ok: true })
    await refresh()
  }

  const handleLogout = () => { logout(); navigate('/login') }
  const initial = user?.full_name?.charAt(0).toUpperCase() || 'U'
  const isAdmin = ['admin', 'moderator'].includes(user?.role || '')

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(155,32,216,0.4)',
    borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '14px',
    outline: 'none', fontFamily: 'Poppins, sans-serif', boxSizing: 'border-box', marginBottom: '10px',
  }
  const editCardStyle: React.CSSProperties = {
    background: '#1a1640', borderRadius: '14px', border: '1px solid rgba(155,32,216,0.3)',
    padding: '16px', marginBottom: '10px',
  }
  const saveBtn = (disabled?: boolean): React.CSSProperties => ({
    width: '100%', padding: '11px', borderRadius: '10px', border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    background: 'linear-gradient(90deg,#e8187a,#9b20d8)', color: '#fff',
    fontWeight: 700, fontFamily: 'Poppins, sans-serif', opacity: disabled ? 0.5 : 1,
  })

  return (
    <div className="app">
      <TopNav />
      <div style={{ padding: '16px 16px 120px' }}>

        {/* Profile Hero */}
        <div style={{
          background: 'linear-gradient(135deg, #1e0d42 0%, #0e1640 60%, #0a1535 100%)',
          borderRadius: '20px', boxShadow: '0 0 0 1.5px rgba(155,32,216,0.45)',
          padding: '24px 20px', marginBottom: '14px', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '130px', height: '130px', background: 'radial-gradient(circle, rgba(155,32,216,0.25) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'linear-gradient(135deg, #f0a500, #e8187a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 800, color: '#fff', fontFamily: 'Poppins, sans-serif', boxShadow: '0 0 0 3px rgba(240,165,0,0.3)' }}>{initial}</div>
              <div style={{ position: 'absolute', bottom: 2, right: 2, width: '16px', height: '16px', borderRadius: '50%', background: '#22d3ee', border: '2px solid #0e1640' }} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#fff', fontSize: '18px', margin: '0 0 4px' }}>{user?.full_name}</h2>
              <p style={{ color: '#8888aa', fontSize: '13px', fontFamily: 'Poppins, sans-serif', marginBottom: '4px' }}>
                📧 {(user as any)?.email || '—'}
              </p>
              <p style={{ color: '#6060a0', fontSize: '12px', fontFamily: 'Poppins, sans-serif' }}>
                {(user as any)?.phone ? `📞 ${(user as any).phone}` : '📞 No phone added'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ background: 'rgba(155,32,216,0.2)', color: '#9b20d8', borderRadius: '20px', padding: '4px 14px', fontSize: '11px', fontWeight: 700, fontFamily: 'Poppins, sans-serif', letterSpacing: '0.5px' }}>{(user?.role || 'USER').toUpperCase()}</span>
            {totpEnabled && <span style={{ background: 'rgba(74,222,128,0.2)', color: '#4ade80', borderRadius: '20px', padding: '4px 14px', fontSize: '11px', fontWeight: 700, fontFamily: 'Poppins, sans-serif' }}>🔐 2FA ON</span>}
            {(user as any)?.is_flagged && <span style={{ background: 'rgba(232,24,122,0.2)', color: '#e8187a', borderRadius: '20px', padding: '4px 14px', fontSize: '11px', fontWeight: 700, fontFamily: 'Poppins, sans-serif' }}>⚠️ FLAGGED</span>}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
          {[
            { label: 'BALANCE', value: formatCurrency(user?.balance || 0), color: '#f0a500' },
            { label: 'TOTAL WON', value: formatCurrency(user?.total_won || 0), color: '#4ade80' },
            { label: 'DEPOSITED', value: formatCurrency(user?.total_deposited || 0), color: '#9b20d8' },
            { label: 'TICKETS', value: String(user?.tickets_bought || 0), color: '#e8187a' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: '#13112e', borderRadius: '16px', border: '1px solid rgba(155,32,216,0.18)', padding: '16px' }}>
              <p style={{ color: '#7878a8', fontSize: '10px', fontFamily: 'Poppins, sans-serif', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.8px' }}>{label}</p>
              <p style={{ color, fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: '17px' }}>{value}</p>
            </div>
          ))}
        </div>

        <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#fff', fontSize: '14px', marginBottom: '10px' }}>Account Settings</p>

        {msg && (
          <div style={{ background: msg.ok ? 'rgba(74,222,128,0.15)' : 'rgba(232,24,122,0.15)', border: `1px solid ${msg.ok ? '#4ade80' : '#e8187a'}`, borderRadius: '10px', padding: '10px 14px', marginBottom: '10px', color: msg.ok ? '#4ade80' : '#e8187a', fontFamily: 'Poppins, sans-serif', fontSize: '13px' }}>
            {msg.text}
          </div>
        )}

        {/* Full Name */}
        <div style={editCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setEditSection(editSection === 'name' ? null : 'name')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>✏️</span>
              <div>
                <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, color: '#fff', fontSize: '14px' }}>Full Name</p>
                <p style={{ color: '#7878a8', fontSize: '12px', fontFamily: 'Poppins, sans-serif' }}>{user?.full_name}</p>
              </div>
            </div>
            <span style={{ color: '#9b20d8', fontSize: '18px' }}>{editSection === 'name' ? '▲' : '▼'}</span>
          </div>
          {editSection === 'name' && (
            <div style={{ marginTop: '14px' }}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" style={inputStyle} />
              <button onClick={saveNameOrPassword} disabled={saving} style={saveBtn(saving)}>{saving ? 'Saving…' : 'Save Name'}</button>
            </div>
          )}
        </div>

        {/* Phone — with OTP verification */}
        <div style={editCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => {
              if (editSection === 'phone') { setEditSection(null); setPhoneStep('input'); setPhoneOtp('') }
              else { setEditSection('phone'); setPhoneInput((user as any)?.phone || ''); setPhoneStep('input'); setMsg(null) }
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>📞</span>
              <div>
                <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, color: '#fff', fontSize: '14px' }}>Phone Number</p>
                <p style={{ color: (user as any)?.phone ? '#7878a8' : '#e8187a', fontSize: '12px', fontFamily: 'Poppins, sans-serif' }}>
                  {(user as any)?.phone || 'Not set — add for deposits & withdrawals'}
                </p>
              </div>
            </div>
            <span style={{ color: '#22d3ee', fontSize: '18px' }}>{editSection === 'phone' ? '▲' : '▼'}</span>
          </div>
          {editSection === 'phone' && phoneStep === 'input' && (
            <div style={{ marginTop: '14px' }}>
              <input
                value={phoneInput}
                onChange={e => setPhoneInput(e.target.value)}
                placeholder="01XXXXXXXXX"
                style={inputStyle}
              />
              <p style={{ color: '#555', fontSize: '11px', marginTop: '-8px', marginBottom: '10px' }}>An OTP will be sent to your email to confirm</p>
              <button onClick={handlePhoneRequestOtp} disabled={phoneLoading || !phoneInput}
                style={{ ...saveBtn(phoneLoading || !phoneInput), background: 'linear-gradient(90deg,#22d3ee,#9b20d8)' }}>
                {phoneLoading ? 'Sending OTP…' : 'Send Verification OTP →'}
              </button>
            </div>
          )}
          {editSection === 'phone' && phoneStep === 'otp' && (
            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ color: '#aaa', fontSize: '13px', margin: 0 }}>Enter the OTP sent to your email to confirm adding <strong style={{ color: '#22d3ee' }}>{phoneInput}</strong></p>
              <OtpInput value={phoneOtp} onChange={v => setPhoneOtp(v)} disabled={phoneLoading} />
              <OtpTimer key={phoneResendKey} seconds={60} onResend={handlePhoneResend} loading={phoneLoading} />
              <button onClick={handlePhoneVerify} disabled={phoneLoading || phoneOtp.length < 6}
                style={saveBtn(phoneLoading || phoneOtp.length < 6)}>
                {phoneLoading ? 'Verifying…' : 'Confirm & Save Phone'}
              </button>
              <button type="button" onClick={() => { setPhoneStep('input'); setPhoneOtp('') }}
                style={{ background: 'none', border: 'none', color: '#8888aa', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}>
                ← Change number
              </button>
            </div>
          )}
        </div>

        {/* Password */}
        <div style={editCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setEditSection(editSection === 'password' ? null : 'password')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>🔒</span>
              <div>
                <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, color: '#fff', fontSize: '14px' }}>Password</p>
                <p style={{ color: '#7878a8', fontSize: '12px', fontFamily: 'Poppins, sans-serif' }}>Change your password</p>
              </div>
            </div>
            <span style={{ color: '#f472b6', fontSize: '18px' }}>{editSection === 'password' ? '▲' : '▼'}</span>
          </div>
          {editSection === 'password' && (
            <div style={{ marginTop: '14px' }}>
              <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Current password" style={inputStyle} />
              <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="New password (min 6 chars)" style={inputStyle} />
              <button onClick={saveNameOrPassword} disabled={saving || newPw.length < 6} style={saveBtn(saving || newPw.length < 6)}>{saving ? 'Saving…' : 'Change Password'}</button>
            </div>
          )}
        </div>

        {/* TOTP 2FA — admin/moderator only */}
        {isAdmin && (
          <div style={editCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => {
                if (totpEnabled) { setEditSection(editSection === 'totp-disable' ? null : 'totp-disable'); setTotpCode('') }
                else if (editSection === 'totp-setup') { setEditSection(null) }
                else { startTotpSetup() }
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>🔐</span>
                <div>
                  <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, color: '#fff', fontSize: '14px' }}>Authenticator 2FA</p>
                  <p style={{ color: totpEnabled ? '#4ade80' : '#7878a8', fontSize: '12px', fontFamily: 'Poppins, sans-serif' }}>
                    {totpEnabled ? '✅ Enabled — Extra secure' : 'Not enabled'}
                  </p>
                </div>
              </div>
              {totpLoading
                ? <span style={{ color: '#9b20d8', fontSize: '13px' }}>…</span>
                : <span style={{ color: totpEnabled ? '#e8187a' : '#4ade80', fontSize: '13px', fontWeight: 700, fontFamily: 'Poppins, sans-serif' }}>
                    {totpEnabled ? 'Disable' : 'Enable'}
                  </span>
              }
            </div>
            {editSection === 'totp-setup' && !totpEnabled && (
              <div style={{ marginTop: '16px' }}>
                <p style={{ color: '#aaa', fontSize: '13px', fontFamily: 'Poppins, sans-serif', marginBottom: '12px', lineHeight: 1.6 }}>
                  1. Install <strong style={{ color: '#fff' }}>Google Authenticator</strong> or <strong style={{ color: '#fff' }}>Authy</strong><br />
                  2. Scan the QR code below<br />
                  3. Enter the 6-digit code to confirm
                </p>
                {totpQr && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                    <div style={{ background: '#fff', borderRadius: '12px', padding: '12px' }}>
                      <img src={totpQr} alt="2FA QR Code" style={{ width: '160px', height: '160px', display: 'block' }} />
                    </div>
                  </div>
                )}
                {totpSecret && (
                  <p style={{ color: '#8888aa', fontSize: '11px', fontFamily: 'Poppins, sans-serif', textAlign: 'center', marginBottom: '14px', wordBreak: 'break-all' }}>
                    Manual key: <span style={{ color: '#f0a500' }}>{totpSecret}</span>
                  </p>
                )}
                <input type="text" inputMode="numeric" maxLength={6} value={totpCode} onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))} placeholder="Enter 6-digit code" style={inputStyle} />
                <button onClick={enableTotp} disabled={totpLoading || totpCode.length < 6} style={saveBtn(totpLoading || totpCode.length < 6)}>
                  {totpLoading ? 'Verifying…' : 'Confirm & Enable 2FA'}
                </button>
              </div>
            )}
            {editSection === 'totp-disable' && totpEnabled && (
              <div style={{ marginTop: '16px' }}>
                <p style={{ color: '#aaa', fontSize: '13px', fontFamily: 'Poppins, sans-serif', marginBottom: '12px' }}>
                  Enter the current code from your authenticator app to disable 2FA.
                </p>
                <input type="text" inputMode="numeric" maxLength={6} value={totpCode} onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))} placeholder="6-digit authenticator code" style={inputStyle} />
                <button onClick={disableTotp} disabled={totpLoading || totpCode.length < 6}
                  style={{ ...saveBtn(totpLoading || totpCode.length < 6), background: 'rgba(232,24,122,0.8)' }}>
                  {totpLoading ? 'Disabling…' : 'Disable 2FA'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Quick Nav */}
        <div style={{ background: '#13112e', borderRadius: '18px', border: '1px solid rgba(155,32,216,0.18)', overflow: 'hidden', marginBottom: '14px', marginTop: '4px' }}>
          {[
            { emoji: '🎟️', label: 'My Tickets', sub: 'View all tickets', path: '/my-tickets' },
            { emoji: '👛', label: 'Wallet', sub: 'Balance & history', path: '/wallet' },
            { emoji: '💳', label: 'Add Money', sub: 'bKash · Nagad · Rocket', path: '/deposit' },
            { emoji: '🔔', label: 'Notifications', sub: 'Your alerts & updates', path: '/notifications' },
          ].map((item, i) => (
            <div key={item.path} onClick={() => navigate(item.path)} style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: i < 3 ? '1px solid rgba(155,32,216,0.1)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>{item.emoji}</span>
                <div>
                  <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, color: '#fff', fontSize: '14px' }}>{item.label}</p>
                  <p style={{ color: '#7878a8', fontSize: '12px', fontFamily: 'Poppins, sans-serif' }}>{item.sub}</p>
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18L15 12L9 6" stroke="#6060a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          ))}
        </div>

        <button onClick={handleLogout} style={{ width: '100%', padding: '15px', borderRadius: '50px', border: '1.5px solid rgba(232,24,122,0.4)', cursor: 'pointer', background: 'rgba(232,24,122,0.08)', color: '#e8187a', fontFamily: 'Poppins, sans-serif', fontSize: '15px', fontWeight: 700, marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="#e8187a" strokeWidth="2" strokeLinecap="round"/><path d="M16 17L21 12L16 7" stroke="#e8187a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12H9" stroke="#e8187a" strokeWidth="2" strokeLinecap="round"/></svg>
          Sign Out
        </button>
      </div>
      <BottomNav />
    </div>
  )
}
