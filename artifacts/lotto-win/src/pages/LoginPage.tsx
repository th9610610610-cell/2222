import { useState } from 'react'
import { useLocation } from 'wouter'
import { useAuth } from '../lib/auth'
import { API_BASE } from '../lib/apiBase'

const BASE = API_BASE

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#08071a', border: '1px solid rgba(155,32,216,0.3)',
  borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '15px',
  outline: 'none', boxSizing: 'border-box',
}

export default function LoginPage() {
  const [, navigate] = useLocation()
  const { login, loginWithToken } = useAuth()
  const [step, setStep] = useState<'login' | 'device'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [pendingEmail, setPendingEmail] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(email, password)
    setLoading(false)
    if (result.error) { setError(result.error); return }
    if (result.new_device) {
      setPendingEmail(result.email || email)
      setInfo(`New device detected. A security code was sent to ${result.email || email}.`)
      setStep('device')
      return
    }
    navigate('/')
  }

  const handleDeviceVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch(`${BASE}/api/auth/verify-device`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: pendingEmail, code: otp, device_ua: navigator.userAgent }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Verification failed'); return }
    loginWithToken(data.token, data.user)
    navigate('/')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#08071a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <span style={{ fontSize: '36px' }}>♛</span>
        <h1 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '28px', fontWeight: 800, background: 'linear-gradient(90deg, #f0a500, #e8187a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '8px 0 4px' }}>Lotto Win</h1>
        <p style={{ color: '#8888aa', fontSize: '14px' }}>
          {step === 'login' ? 'Sign in to your account' : 'Confirm your new device'}
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: '360px', background: '#100f28', borderRadius: '16px', border: '1px solid rgba(155,32,216,0.2)', padding: '28px 24px' }}>
        {error && <div style={{ background: 'rgba(232,24,122,0.15)', border: '1px solid rgba(232,24,122,0.4)', borderRadius: '8px', padding: '12px', color: '#f88', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}
        {info && <div style={{ background: 'rgba(155,32,216,0.1)', border: '1px solid rgba(155,32,216,0.3)', borderRadius: '8px', padding: '12px', color: '#c88cff', fontSize: '13px', marginBottom: '16px' }}>{info}</div>}

        {step === 'login' ? (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'block' }}>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={inputStyle} />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ color: '#aaa', fontSize: '13px' }}>Password</label>
                <span onClick={() => navigate('/forgot-password')} style={{ color: '#f0a500', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Forgot password?</span>
              </div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={inputStyle} />
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', background: 'linear-gradient(90deg, #e8187a, #9b20d8)', color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '16px', fontWeight: 700, opacity: loading ? 0.7 : 1 }} className="shimmer-btn">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleDeviceVerify} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '32px' }}>🔒</span>
              <p style={{ color: '#aaa', fontSize: '13px', marginTop: '8px' }}>Enter the 6-digit code sent to your email</p>
            </div>
            <input
              type="text" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
              placeholder="000000" maxLength={6} required
              style={{ ...inputStyle, fontSize: '24px', letterSpacing: '10px', textAlign: 'center', fontFamily: 'monospace' }}
              autoFocus
            />
            <button type="submit" disabled={loading || otp.length < 6} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', cursor: (loading || otp.length < 6) ? 'not-allowed' : 'pointer', background: 'linear-gradient(90deg, #e8187a, #9b20d8)', color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '16px', fontWeight: 700, opacity: (loading || otp.length < 6) ? 0.7 : 1 }}>
              {loading ? 'Verifying...' : '🔒 Verify & Sign In'}
            </button>
            <button type="button" onClick={() => { setStep('login'); setError(''); setInfo(''); setOtp('') }} style={{ background: 'none', border: 'none', color: '#8888aa', fontSize: '13px', cursor: 'pointer', textAlign: 'center' }}>← Back to login</button>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: '20px', color: '#8888aa', fontSize: '14px' }}>
          Don't have an account?{' '}
          <span onClick={() => navigate('/register')} style={{ color: '#f0a500', cursor: 'pointer', fontWeight: 600 }}>Register</span>
        </p>
      </div>
    </div>
  )
}
