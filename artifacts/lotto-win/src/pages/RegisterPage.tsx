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

function PasswordStrength({ pw }: { pw: string }) {
  const checks = [
    { label: '8+ characters', ok: pw.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(pw) },
    { label: 'Number', ok: /[0-9]/.test(pw) },
  ]
  if (!pw) return null
  return (
    <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
      {checks.map(c => (
        <span key={c.label} style={{ fontSize: '11px', color: c.ok ? '#4ade80' : '#888', display: 'flex', alignItems: 'center', gap: '3px' }}>
          {c.ok ? '✓' : '○'} {c.label}
        </span>
      ))}
    </div>
  )
}

export default function RegisterPage() {
  const [, navigate] = useLocation()
  const { loginWithToken } = useAuth()
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', password: '' })
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const inp = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }))

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Registration failed'); return }
    setSuccess(`OTP sent to ${data.email}. Check your inbox (and spam folder).`)
    setStep('otp')
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch(`${BASE}/api/auth/verify-email`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email, code: otp, full_name: form.full_name, phone: form.phone, password: form.password }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Verification failed'); return }
    loginWithToken(data.token, data.user)
    navigate('/')
  }

  const resendOTP = async () => {
    setError(''); setSuccess('')
    const res = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (res.ok) setSuccess('OTP resent! Check your inbox.')
    else setError(data.error || 'Failed to resend')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#08071a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ marginBottom: '28px', textAlign: 'center' }}>
        <span style={{ fontSize: '36px' }}>♛</span>
        <h1 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '26px', fontWeight: 800, background: 'linear-gradient(90deg, #f0a500, #e8187a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '8px 0 4px' }}>
          {step === 'form' ? 'Create Account' : 'Verify Email'}
        </h1>
        <p style={{ color: '#8888aa', fontSize: '14px' }}>
          {step === 'form' ? 'Join Lotto Win today' : `Enter the 6-digit code sent to ${form.email}`}
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: '360px', background: '#100f28', borderRadius: '16px', border: '1px solid rgba(155,32,216,0.2)', padding: '28px 24px' }}>
        {error && <div style={{ background: 'rgba(232,24,122,0.15)', border: '1px solid rgba(232,24,122,0.4)', borderRadius: '8px', padding: '12px', color: '#f88', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}
        {success && <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '8px', padding: '12px', color: '#4ade80', fontSize: '13px', marginBottom: '16px' }}>{success}</div>}

        {step === 'form' ? (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'block' }}>Full Name</label>
              <input type="text" value={form.full_name} onChange={e => inp('full_name', e.target.value)} placeholder="Your full name" required style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'block' }}>Email Address</label>
              <input type="email" value={form.email} onChange={e => inp('email', e.target.value)} placeholder="you@example.com" required style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'block' }}>Phone Number</label>
              <input type="tel" value={form.phone} onChange={e => inp('phone', e.target.value)} placeholder="01XXXXXXXXX" required style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'block' }}>Password</label>
              <input type="password" value={form.password} onChange={e => inp('password', e.target.value)} placeholder="Min 8 chars, uppercase + number" required style={inputStyle} />
              <PasswordStrength pw={form.password} />
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', background: 'linear-gradient(90deg, #f0a500, #e8187a)', color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '16px', fontWeight: 700, opacity: loading ? 0.7 : 1, marginTop: '4px' }}>
              {loading ? 'Sending OTP...' : 'Continue →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'block' }}>6-Digit OTP Code</label>
              <input
                type="text" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                placeholder="000000" maxLength={6} required
                style={{ ...inputStyle, fontSize: '22px', letterSpacing: '8px', textAlign: 'center', fontFamily: 'monospace' }}
                autoFocus
              />
            </div>
            <button type="submit" disabled={loading || otp.length < 6} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', cursor: (loading || otp.length < 6) ? 'not-allowed' : 'pointer', background: 'linear-gradient(90deg, #f0a500, #e8187a)', color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '16px', fontWeight: 700, opacity: (loading || otp.length < 6) ? 0.7 : 1 }}>
              {loading ? 'Verifying...' : '✓ Verify & Create Account'}
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button type="button" onClick={() => { setStep('form'); setError(''); setSuccess('') }} style={{ background: 'none', border: 'none', color: '#8888aa', fontSize: '13px', cursor: 'pointer' }}>← Back</button>
              <button type="button" onClick={resendOTP} style={{ background: 'none', border: 'none', color: '#f0a500', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>Resend OTP</button>
            </div>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: '20px', color: '#8888aa', fontSize: '14px' }}>
          Already have an account?{' '}
          <span onClick={() => navigate('/login')} style={{ color: '#f0a500', cursor: 'pointer', fontWeight: 600 }}>Sign In</span>
        </p>
      </div>
    </div>
  )
}
