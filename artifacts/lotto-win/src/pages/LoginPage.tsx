import { useState } from 'react'
import { useLocation } from 'wouter'
import { useAuth } from '../lib/auth'
import { API_BASE } from '../lib/apiBase'
import OtpInput, { OtpTimer } from '../components/OtpInput'

const BASE = API_BASE

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#08071a', border: '1px solid rgba(155,32,216,0.3)',
  borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '15px',
  outline: 'none', boxSizing: 'border-box',
}

export default function LoginPage() {
  const [, navigate] = useLocation()
  const { refresh } = useAuth()
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendKey, setResendKey] = useState(0)

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Login failed'); return }

    if (data.requireOtp) {
      setEmail(data.email || '')
      setStep('otp')
      return
    }

    // Legacy (no email): direct login
    localStorage.setItem('lw_token', data.token)
    await refresh()
    navigate('/')
  }

  const handleResend = async () => {
    setError(''); setLoading(true)
    await fetch(`${BASE}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
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
      body: JSON.stringify({ phone, otp }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Verification failed'); return }
    localStorage.setItem('lw_token', data.token)
    await refresh()
    navigate('/')
  }

  const maskedEmail = email ? email.replace(/(.{2}).+(@.+)/, '$1***$2') : ''

  return (
    <div style={{ minHeight: '100vh', background: '#08071a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <span style={{ fontSize: '36px' }}>♛</span>
        <h1 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '28px', fontWeight: 800, background: 'linear-gradient(90deg, #f0a500, #e8187a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '8px 0 4px' }}>Lotto Win</h1>
        <p style={{ color: '#8888aa', fontSize: '14px' }}>
          {step === 'credentials' ? 'Sign in to your account' : 'Check your email'}
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: '360px', background: '#100f28', borderRadius: '16px', border: '1px solid rgba(155,32,216,0.2)', padding: '28px 24px' }}>
        {error && (
          <div style={{ background: 'rgba(232,24,122,0.12)', border: '1px solid rgba(232,24,122,0.4)', borderRadius: '8px', padding: '10px 12px', color: '#f88', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {step === 'credentials' && (
          <form onSubmit={handleCredentials} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'block' }}>Phone Number</label>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="01XXXXXXXXX" required style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Password</span>
                <span onClick={() => navigate('/forgot-password')} style={{ color: '#9b20d8', cursor: 'pointer', fontSize: '12px' }}>Forgot password?</span>
              </label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={inputStyle} />
            </div>
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              background: loading ? 'rgba(155,32,216,0.3)' : 'linear-gradient(90deg, #e8187a, #9b20d8)',
              color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '16px', fontWeight: 700, opacity: loading ? 0.7 : 1,
            }}>
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleOtp} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>📧</div>
              <p style={{ color: '#ccc', fontSize: '14px', lineHeight: 1.6 }}>
                Verification code sent to<br />
                <strong style={{ color: '#f0a500' }}>{maskedEmail}</strong>
              </p>
            </div>
            <OtpInput value={otp} onChange={setOtp} disabled={loading} />
            <OtpTimer key={resendKey} seconds={60} onResend={handleResend} loading={loading} />
            <button type="submit" disabled={loading || otp.length < 6} style={{
              width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
              cursor: (loading || otp.length < 6) ? 'not-allowed' : 'pointer',
              background: (loading || otp.length < 6) ? 'rgba(155,32,216,0.3)' : 'linear-gradient(90deg, #e8187a, #9b20d8)',
              color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '16px', fontWeight: 700,
              opacity: (loading || otp.length < 6) ? 0.7 : 1,
            }}>
              {loading ? 'Verifying...' : 'Verify & Sign In ✓'}
            </button>
            <button type="button" onClick={() => { setStep('credentials'); setOtp(''); setError('') }}
              style={{ background: 'none', border: 'none', color: '#8888aa', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}>
              ← Back to login
            </button>
          </form>
        )}

        {step === 'credentials' && (
          <p style={{ textAlign: 'center', marginTop: '20px', color: '#8888aa', fontSize: '14px' }}>
            Don't have an account?{' '}
            <span onClick={() => navigate('/register')} style={{ color: '#f0a500', cursor: 'pointer', fontWeight: 600 }}>Register</span>
          </p>
        )}
      </div>
    </div>
  )
}
