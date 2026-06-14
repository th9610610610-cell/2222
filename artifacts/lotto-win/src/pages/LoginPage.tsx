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

const btnPrimary = (disabled?: boolean): React.CSSProperties => ({
  width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer',
  background: disabled ? 'rgba(155,32,216,0.3)' : 'linear-gradient(90deg, #e8187a, #9b20d8)',
  color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '16px',
  fontWeight: 700, opacity: disabled ? 0.7 : 1, transition: 'opacity 0.2s',
})

type LoginMode = 'password' | 'otp'
type OtpStep = 'email' | 'verify'

export default function LoginPage() {
  const [, navigate] = useLocation()
  const { refresh } = useAuth()

  const [mode, setMode] = useState<LoginMode>('password')

  // Password login state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // OTP login state
  const [otpStep, setOtpStep] = useState<OtpStep>('email')
  const [otpEmail, setOtpEmail] = useState('')
  const [otpEmailConfirmed, setOtpEmailConfirmed] = useState('')
  const [otp, setOtp] = useState('')
  const [resendKey, setResendKey] = useState(0)
  const [resendMsg, setResendMsg] = useState('')

  // Shared
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const switchMode = (m: LoginMode) => {
    setMode(m); setError(''); setResendMsg('')
    setOtpStep('email'); setOtp(''); setOtpEmail(''); setOtpEmailConfirmed('')
  }

  // ── Password login ────────────────────────────────────────────────
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Login failed'); return }
    localStorage.setItem('lw_token', data.token)
    await refresh()
    navigate('/')
  }

  // ── OTP login step 1: request OTP ─────────────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    const res = await fetch(`${BASE}/api/auth/login/otp-request`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: otpEmail.trim().toLowerCase() }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Failed to send OTP'); return }
    setOtpEmailConfirmed(data.email || otpEmail.trim().toLowerCase())
    setOtpStep('verify')
  }

  // ── OTP login step 1 resend ───────────────────────────────────────
  const handleResend = async () => {
    setError(''); setResendMsg(''); setLoading(true)
    const res = await fetch(`${BASE}/api/auth/login/otp-request`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: otpEmail.trim().toLowerCase() }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Could not resend OTP'); return }
    setResendMsg('OTP resent! Check your inbox.')
    setResendKey(k => k + 1)
  }

  // ── OTP login step 2: verify ──────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length < 6) { setError('Enter the 6-digit OTP'); return }
    setError(''); setLoading(true)
    const res = await fetch(`${BASE}/api/auth/login/verify`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: otpEmailConfirmed, otp }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Verification failed'); return }
    localStorage.setItem('lw_token', data.token)
    await refresh()
    navigate('/')
  }

  const maskedOtpEmail = otpEmailConfirmed ? otpEmailConfirmed.replace(/(.{2}).+(@.+)/, '$1***$2') : ''

  return (
    <div style={{ minHeight: '100vh', background: '#08071a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ marginBottom: '28px', textAlign: 'center' }}>
        <span style={{ fontSize: '36px' }}>♛</span>
        <h1 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '28px', fontWeight: 800, background: 'linear-gradient(90deg, #f0a500, #e8187a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '8px 0 4px' }}>
          Lotto Win
        </h1>
        <p style={{ color: '#8888aa', fontSize: '14px' }}>Sign in to your account</p>
      </div>

      <div style={{ width: '100%', maxWidth: '380px', background: '#100f28', borderRadius: '16px', border: '1px solid rgba(155,32,216,0.2)', padding: '28px 24px' }}>

        {/* Mode toggle */}
        <div style={{ display: 'flex', background: '#08071a', borderRadius: '10px', padding: '4px', marginBottom: '24px', border: '1px solid rgba(155,32,216,0.2)' }}>
          {(['password', 'otp'] as LoginMode[]).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              style={{
                flex: 1, padding: '9px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontFamily: 'Poppins, sans-serif', fontSize: '13px', fontWeight: 600,
                background: mode === m ? 'linear-gradient(90deg, #9b20d8, #e8187a)' : 'transparent',
                color: mode === m ? '#fff' : '#8888aa',
                transition: 'all 0.2s',
              }}
            >
              {m === 'password' ? '🔑 Password' : '📧 Email OTP'}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: 'rgba(232,24,122,0.12)', border: '1px solid rgba(232,24,122,0.4)', borderRadius: '8px', padding: '10px 12px', color: '#f88', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}
        {resendMsg && (
          <div style={{ background: 'rgba(240,165,0,0.1)', border: '1px solid rgba(240,165,0,0.4)', borderRadius: '8px', padding: '10px 12px', color: '#f0a500', fontSize: '13px', marginBottom: '16px' }}>
            {resendMsg}
          </div>
        )}

        {/* ── Password mode ── */}
        {mode === 'password' && (
          <form onSubmit={handlePasswordLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'block' }}>Email Address</label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required style={inputStyle}
              />
            </div>
            <div>
              <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Password</span>
                <span onClick={() => navigate('/forgot-password')} style={{ color: '#9b20d8', cursor: 'pointer', fontSize: '12px' }}>Forgot password?</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  style={{ ...inputStyle, paddingRight: '42px' }}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8888aa', cursor: 'pointer', fontSize: '16px', padding: '2px' }}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} style={btnPrimary(loading)}>
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>
        )}

        {/* ── OTP mode step 1: enter email ── */}
        {mode === 'otp' && otpStep === 'email' && (
          <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '4px' }}>
              <div style={{ fontSize: '40px' }}>📧</div>
              <p style={{ color: '#aaa', fontSize: '13px', marginTop: '8px' }}>We'll send a one-time code to your registered email</p>
            </div>
            <div>
              <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'block' }}>Email Address</label>
              <input
                type="email" value={otpEmail}
                onChange={e => setOtpEmail(e.target.value)}
                placeholder="you@example.com" required style={inputStyle}
              />
            </div>
            <button type="submit" disabled={loading} style={btnPrimary(loading)}>
              {loading ? 'Sending OTP...' : 'Send OTP →'}
            </button>
          </form>
        )}

        {/* ── OTP mode step 2: enter OTP ── */}
        {mode === 'otp' && otpStep === 'verify' && (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>📬</div>
              <p style={{ color: '#ccc', fontSize: '14px', lineHeight: 1.6 }}>
                Enter the 6-digit code sent to<br />
                <strong style={{ color: '#f0a500' }}>{maskedOtpEmail}</strong>
              </p>
              <p style={{ color: '#8888aa', fontSize: '12px', marginTop: '6px' }}>Check spam/junk folder if not in inbox</p>
            </div>
            <OtpInput value={otp} onChange={v => { setOtp(v); setError('') }} disabled={loading} />
            <OtpTimer key={resendKey} seconds={60} onResend={handleResend} loading={loading} />
            <p style={{ color: '#555', fontSize: '11px', textAlign: 'center', marginTop: '-12px' }}>Code expires in 1 minute</p>
            <button type="submit" disabled={loading || otp.length < 6} style={btnPrimary(loading || otp.length < 6)}>
              {loading ? 'Verifying...' : 'Verify & Sign In ✓'}
            </button>
            <button type="button"
              onClick={() => { setOtpStep('email'); setOtp(''); setError(''); setResendMsg('') }}
              style={{ background: 'none', border: 'none', color: '#8888aa', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}>
              ← Change email
            </button>
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
