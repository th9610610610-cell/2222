import { useState } from 'react'
import { useLocation } from 'wouter'
import { API_BASE } from '../lib/apiBase'
import OtpInput, { OtpTimer } from '../components/OtpInput'

const BASE = API_BASE

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#08071a', border: '1px solid rgba(155,32,216,0.3)',
  borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '15px',
  outline: 'none', boxSizing: 'border-box',
}

export default function AdminLoginPage() {
  const [, navigate] = useLocation()
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otpEmail, setOtpEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendKey, setResendKey] = useState(0)

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Login failed'); return }

    if (!['admin', 'moderator'].includes(data.user?.role)) {
      setError('Access denied. Admin only.'); return
    }

    localStorage.setItem('lw_token', data.token)
    sessionStorage.setItem('lw_admin_verified', '1')
    navigate('/admin')
  }

  const handleResend = async () => {
    setError(''); setLoading(true)
    await fetch(`${BASE}/api/auth/login/otp-request`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    })
    setLoading(false)
    setResendKey(k => k + 1)
  }

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length < 6) { setError('Enter the 6-digit OTP'); return }
    setError(''); setLoading(true)
    const res = await fetch(`${BASE}/api/auth/login/verify`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: otpEmail, otp }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Verification failed'); return }
    if (!['admin', 'moderator'].includes(data.user?.role)) {
      setError('Access denied. Admin only.'); return
    }
    localStorage.setItem('lw_token', data.token)
    sessionStorage.setItem('lw_admin_verified', '1')
    navigate('/admin')
  }

  const maskedEmail = otpEmail ? otpEmail.replace(/(.{2}).+(@.+)/, '$1***$2') : ''

  return (
    <div style={{ minHeight: '100vh', background: '#08071a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '8px' }}>🔐</div>
        <h1 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '22px', fontWeight: 800, color: '#fff' }}>Admin Control Center</h1>
        <p style={{ color: '#8888aa', fontSize: '14px', marginTop: '6px' }}>
          {step === 'credentials' ? 'Secure administrator access only' : 'Email OTP verification required'}
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: '360px', background: '#100f28', borderRadius: '16px', border: '1px solid rgba(155,32,216,0.3)', padding: '28px 24px' }}>
        {error && <div style={{ background: 'rgba(232,24,122,0.12)', border: '1px solid rgba(232,24,122,0.4)', borderRadius: '8px', padding: '10px 12px', color: '#f88', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}

        {step === 'credentials' && (
          <form onSubmit={handleCredentials} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'block' }}>Admin Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" required style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'block' }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={inputStyle} />
            </div>
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              background: loading ? 'rgba(155,32,216,0.3)' : 'linear-gradient(90deg, #9b20d8, #e8187a)',
              color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '16px', fontWeight: 700, opacity: loading ? 0.7 : 1,
            }}>
              {loading ? 'Verifying...' : 'Access Admin Panel →'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleOtp} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>📧</div>
              <p style={{ color: '#ccc', fontSize: '14px', lineHeight: 1.6 }}>
                Admin OTP sent to<br />
                <strong style={{ color: '#f0a500' }}>{maskedEmail || 'your registered email'}</strong>
              </p>
              <div style={{ marginTop: '10px', padding: '8px', background: 'rgba(155,32,216,0.08)', borderRadius: '8px', border: '1px solid rgba(155,32,216,0.2)' }}>
                <span style={{ color: '#9b20d8', fontSize: '12px' }}>🔒 Extra verification required for admin access</span>
              </div>
            </div>
            <OtpInput value={otp} onChange={setOtp} disabled={loading} />
            <OtpTimer key={resendKey} seconds={60} onResend={handleResend} loading={loading} />
            <p style={{ color: '#555', fontSize: '11px', textAlign: 'center', marginTop: '-12px' }}>Code expires in 1 minute</p>
            <button type="submit" disabled={loading || otp.length < 6} style={{
              width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
              cursor: (loading || otp.length < 6) ? 'not-allowed' : 'pointer',
              background: (loading || otp.length < 6) ? 'rgba(155,32,216,0.3)' : 'linear-gradient(90deg, #9b20d8, #e8187a)',
              color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '16px', fontWeight: 700,
              opacity: (loading || otp.length < 6) ? 0.7 : 1,
            }}>
              {loading ? 'Verifying...' : 'Verify & Enter Admin →'}
            </button>
            <button type="button" onClick={() => { setStep('credentials'); setOtp(''); setError('') }}
              style={{ background: 'none', border: 'none', color: '#8888aa', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}>
              ← Back
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
