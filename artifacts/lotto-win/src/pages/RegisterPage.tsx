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

const btnStyle = (gradient: string, disabled?: boolean): React.CSSProperties => ({
  width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer',
  background: disabled ? 'rgba(155,32,216,0.3)' : gradient,
  color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '16px',
  fontWeight: 700, opacity: disabled ? 0.7 : 1, transition: 'opacity 0.2s',
})

export default function RegisterPage() {
  const [, navigate] = useLocation()
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '' })
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendKey, setResendKey] = useState(0)

  const inp = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    const res = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Registration failed'); return }
    setStep('otp')
  }

  const handleResend = async () => {
    setError(''); setLoading(true)
    await fetch(`${BASE}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setLoading(false)
    setResendKey(k => k + 1)
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length < 6) { setError('Enter the 6-digit OTP'); return }
    setError(''); setLoading(true)
    const res = await fetch(`${BASE}/api/auth/register/verify`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, otp }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Verification failed'); return }
    setSuccess('Account created! Redirecting to login...')
    setTimeout(() => navigate('/login'), 1500)
  }

  const maskedEmail = form.email
    ? form.email.replace(/(.{2}).+(@.+)/, '$1***$2')
    : ''

  return (
    <div style={{ minHeight: '100vh', background: '#08071a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ marginBottom: '28px', textAlign: 'center' }}>
        <span style={{ fontSize: '36px' }}>♛</span>
        <h1 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '26px', fontWeight: 800, background: 'linear-gradient(90deg, #f0a500, #e8187a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '8px 0 4px' }}>
          {step === 'form' ? 'Create Account' : 'Verify Email'}
        </h1>
        <p style={{ color: '#8888aa', fontSize: '14px' }}>
          {step === 'form' ? 'Join Lotto Win today' : `OTP sent to ${maskedEmail}`}
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
        {error && <div style={{ background: 'rgba(232,24,122,0.12)', border: '1px solid rgba(232,24,122,0.4)', borderRadius: '8px', padding: '10px 12px', color: '#f88', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}
        {success && <div style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: '8px', padding: '10px 12px', color: '#6ee7a0', fontSize: '13px', marginBottom: '16px' }}>{success}</div>}

        {step === 'form' && (
          <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'block' }}>Full Name</label>
              <input type="text" value={form.full_name} onChange={e => inp('full_name', e.target.value)} placeholder="Your full name" required style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'block' }}>Email Address</label>
              <input type="email" value={form.email} onChange={e => inp('email', e.target.value)} placeholder="you@example.com" required style={inputStyle} />
              <p style={{ color: '#666', fontSize: '11px', marginTop: '4px' }}>OTP will be sent here for verification</p>
            </div>
            <div>
              <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'block' }}>Phone Number</label>
              <input type="tel" value={form.phone} onChange={e => inp('phone', e.target.value)} placeholder="01XXXXXXXXX" required style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'block' }}>Password</label>
              <input type="password" value={form.password} onChange={e => inp('password', e.target.value)} placeholder="Min 8 chars, upper, lower, number, symbol" required style={inputStyle} />
              <p style={{ color: '#666', fontSize: '11px', marginTop: '4px' }}>e.g. MyPass@123</p>
            </div>
            <button type="submit" disabled={loading} style={btnStyle('linear-gradient(90deg, #f0a500, #e8187a)', loading)}>
              {loading ? 'Sending OTP...' : 'Send Verification OTP →'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>📧</div>
              <p style={{ color: '#ccc', fontSize: '14px', lineHeight: 1.6 }}>
                Enter the 6-digit code sent to<br />
                <strong style={{ color: '#f0a500' }}>{maskedEmail}</strong>
              </p>
            </div>
            <OtpInput value={otp} onChange={setOtp} disabled={loading} />
            <OtpTimer key={resendKey} seconds={60} onResend={handleResend} loading={loading} />
            <button type="submit" disabled={loading || otp.length < 6} style={btnStyle('linear-gradient(90deg, #f0a500, #e8187a)', loading || otp.length < 6)}>
              {loading ? 'Verifying...' : 'Verify & Create Account ✓'}
            </button>
            <button type="button" onClick={() => { setStep('form'); setOtp(''); setError('') }}
              style={{ background: 'none', border: 'none', color: '#8888aa', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}>
              ← Change details
            </button>
          </form>
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
