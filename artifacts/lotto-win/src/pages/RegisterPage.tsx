import { useState } from 'react'
import { useLocation } from 'wouter'
import { API_BASE } from '../lib/apiBase'
import { useAuth } from '../lib/auth'
import OtpInput, { OtpTimer } from '../components/OtpInput'

const BASE = API_BASE

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#08071a', border: '1px solid rgba(155,32,216,0.3)',
  borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '15px',
  outline: 'none', boxSizing: 'border-box',
}

const btnStyle = (gradient: string, disabled?: boolean): React.CSSProperties => ({
  width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer',
  background: disabled ? 'rgba(155,32,216,0.3)' : gradient,
  color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '16px',
  fontWeight: 700, opacity: disabled ? 0.7 : 1, transition: 'opacity 0.2s',
})

export default function RegisterPage() {
  const [, navigate] = useLocation()
  const { refresh } = useAuth()
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [form, setForm] = useState({ full_name: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendKey, setResendKey] = useState(0)
  const [resendMsg, setResendMsg] = useState('')

  const inp = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(''); setLoading(true)
    const res = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, email: form.email.trim().toLowerCase() }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Registration failed'); return }
    setStep('otp')
  }

  const handleResend = async () => {
    setError(''); setResendMsg(''); setLoading(true)
    const res = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, email: form.email.trim().toLowerCase() }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Could not resend OTP'); return }
    setResendMsg('New code sent! Check your inbox.')
    setResendKey(k => k + 1)
  }

  const handleVerify = async (otpVal?: string) => {
    const code = otpVal ?? otp
    if (code.length < 6) { setError('Enter the 6-digit code'); return }
    setError(''); setLoading(true)
    const res = await fetch(`${BASE}/api/auth/register/verify`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, email: form.email.trim().toLowerCase(), otp: code }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Verification failed'); return }
    if (data.token) {
      localStorage.setItem('lw_token', data.token)
      await refresh()
      navigate('/')
    }
  }

  const maskedEmail = form.email
    ? form.email.replace(/(.{2}).+(@.+)/, '$1***$2')
    : ''

  return (
    <div style={{ minHeight: '100vh', background: '#08071a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <span style={{ fontSize: '36px' }}>♛</span>
        <h1 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '26px', fontWeight: 800, background: 'linear-gradient(90deg, #f0a500, #e8187a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '8px 0 4px' }}>
          {step === 'form' ? 'Create Account' : 'Verify Email'}
        </h1>
        <p style={{ color: '#8888aa', fontSize: '14px' }}>
          {step === 'form' ? 'Join Lotto Win today' : `Code sent to ${maskedEmail}`}
        </p>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px' }}>
        {['Details', 'Verify'].map((label, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 700,
              background: (step === 'form' && i === 0) || (step === 'otp' && i <= 1) ? 'linear-gradient(135deg,#9b20d8,#e8187a)' : 'rgba(155,32,216,0.2)',
              color: '#fff',
            }}>{i === 0 && step === 'otp' ? '✓' : i + 1}</div>
            <span style={{ fontSize: '12px', color: step === 'form' && i === 1 ? '#444' : '#aaa' }}>{label}</span>
            {i === 0 && <div style={{ width: '24px', height: '2px', background: step === 'otp' ? 'linear-gradient(90deg,#9b20d8,#e8187a)' : 'rgba(155,32,216,0.2)', borderRadius: '2px' }} />}
          </div>
        ))}
      </div>

      <div style={{ width: '100%', maxWidth: '380px', background: '#100f28', borderRadius: '16px', border: '1px solid rgba(155,32,216,0.2)', padding: '28px 24px' }}>
        {error && (
          <div style={{ background: 'rgba(232,24,122,0.12)', border: '1px solid rgba(232,24,122,0.4)', borderRadius: '8px', padding: '10px 12px', color: '#f88', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}
        {resendMsg && (
          <div style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: '8px', padding: '10px 12px', color: '#6ee7a0', fontSize: '13px', marginBottom: '16px' }}>
            ✅ {resendMsg}
          </div>
        )}

        {step === 'form' && (
          <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'block' }}>Full Name</label>
              <input type="text" value={form.full_name} onChange={e => inp('full_name', e.target.value)} placeholder="Your full name" required style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'block' }}>Email Address</label>
              <input type="email" value={form.email} onChange={e => inp('email', e.target.value)} placeholder="you@example.com" required style={inputStyle} />
              <p style={{ color: '#555', fontSize: '11px', marginTop: '4px' }}>Used for login and verification code</p>
            </div>
            <div>
              <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'block' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => inp('password', e.target.value)}
                  placeholder="Min 8 chars, upper, lower, number, symbol"
                  required
                  style={{ ...inputStyle, paddingRight: '42px' }}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8888aa', cursor: 'pointer', fontSize: '16px', padding: '2px' }}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              <p style={{ color: '#555', fontSize: '11px', marginTop: '4px' }}>e.g. MyPass@123</p>
            </div>

            {/* Optional phone notice */}
            <div style={{ background: 'rgba(155,32,216,0.08)', border: '1px solid rgba(155,32,216,0.2)', borderRadius: '8px', padding: '10px 12px' }}>
              <p style={{ color: '#8888aa', fontSize: '12px', margin: 0 }}>
                📞 <strong style={{ color: '#aaa' }}>Phone number is optional.</strong> You can add it later from your profile for deposits &amp; withdrawals.
              </p>
            </div>

            <button type="submit" disabled={loading} style={btnStyle('linear-gradient(90deg, #f0a500, #e8187a)', loading)}>
              {loading ? '⏳ Sending code...' : 'Send Verification Code →'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>📨</div>
              <p style={{ color: '#ccc', fontSize: '15px', lineHeight: 1.6, margin: 0 }}>
                Enter the 6-digit code sent to<br />
                <strong style={{ color: '#f0a500' }}>{maskedEmail}</strong>
              </p>
              <p style={{ color: '#555', fontSize: '12px', marginTop: '6px' }}>
                Not in inbox? Check your <strong style={{ color: '#888' }}>spam/junk</strong> folder
              </p>
            </div>

            <OtpInput
              value={otp}
              onChange={v => { setOtp(v); setError('') }}
              onComplete={val => handleVerify(val)}
              disabled={loading}
            />

            <OtpTimer key={resendKey} seconds={60} onResend={handleResend} loading={loading} />
            <p style={{ color: '#555', fontSize: '11px', textAlign: 'center', marginTop: '-12px' }}>Code expires in 1 minute</p>

            <button
              type="button"
              onClick={() => handleVerify()}
              disabled={loading || otp.length < 6}
              style={btnStyle('linear-gradient(90deg, #f0a500, #e8187a)', loading || otp.length < 6)}
            >
              {loading ? '⏳ Verifying...' : 'Verify & Create Account ✓'}
            </button>

            <button type="button" onClick={() => { setStep('form'); setOtp(''); setError(''); setResendMsg('') }}
              style={{ background: 'none', border: 'none', color: '#8888aa', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}>
              ← Change details
            </button>
          </div>
        )}

        {step === 'form' && (
          <p style={{ textAlign: 'center', marginTop: '20px', color: '#8888aa', fontSize: '14px' }}>
            Already have an account?{' '}
            <span onClick={() => navigate('/login')} style={{ color: '#f0a500', cursor: 'pointer', fontWeight: 600 }}>Sign In</span>
          </p>
        )}
      </div>
    </div>
  )
}
