import { useState } from 'react'
import { useLocation } from 'wouter'
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

export default function ForgotPasswordPage() {
  const [, navigate] = useLocation()
  const [step, setStep] = useState<'email' | 'reset' | 'done'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch(`${BASE}/api/auth/forgot-password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Failed'); return }
    setInfo(`A reset code has been sent to ${email}. Check your inbox (and spam folder).`)
    setStep('reset')
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return }
    setLoading(true)
    const res = await fetch(`${BASE}/api/auth/reset-password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code: otp, new_password: newPassword }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Reset failed'); return }
    setStep('done')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#08071a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ marginBottom: '28px', textAlign: 'center' }}>
        <span style={{ fontSize: '36px' }}>{step === 'done' ? '✅' : '🔑'}</span>
        <h1 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '24px', fontWeight: 800, color: '#fff', margin: '8px 0 4px' }}>
          {step === 'email' ? 'Forgot Password' : step === 'reset' ? 'Reset Password' : 'Password Reset!'}
        </h1>
        <p style={{ color: '#8888aa', fontSize: '14px' }}>
          {step === 'email' ? "Enter your email to receive a reset code"
            : step === 'reset' ? "Enter the code and your new password"
            : "You can now sign in with your new password"}
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: '360px', background: '#100f28', borderRadius: '16px', border: '1px solid rgba(155,32,216,0.2)', padding: '28px 24px' }}>
        {error && <div style={{ background: 'rgba(232,24,122,0.15)', border: '1px solid rgba(232,24,122,0.4)', borderRadius: '8px', padding: '12px', color: '#f88', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}
        {info && <div style={{ background: 'rgba(155,32,216,0.1)', border: '1px solid rgba(155,32,216,0.3)', borderRadius: '8px', padding: '12px', color: '#c88cff', fontSize: '13px', marginBottom: '16px' }}>{info}</div>}

        {step === 'email' && (
          <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'block' }}>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={inputStyle} autoFocus />
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', background: 'linear-gradient(90deg, #f0a500, #e8187a)', color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '16px', fontWeight: 700, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Sending...' : 'Send Reset Code'}
            </button>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'block' }}>6-Digit Reset Code</label>
              <input
                type="text" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                placeholder="000000" maxLength={6} required
                style={{ ...inputStyle, fontSize: '22px', letterSpacing: '8px', textAlign: 'center', fontFamily: 'monospace' }}
                autoFocus
              />
            </div>
            <div>
              <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'block' }}>New Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 8 chars, uppercase + number" required style={inputStyle} />
              <PasswordStrength pw={newPassword} />
            </div>
            <div>
              <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'block' }}>Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password" required style={inputStyle} />
            </div>
            <button type="submit" disabled={loading || otp.length < 6} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', cursor: (loading || otp.length < 6) ? 'not-allowed' : 'pointer', background: 'linear-gradient(90deg, #f0a500, #e8187a)', color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '16px', fontWeight: 700, opacity: (loading || otp.length < 6) ? 0.7 : 1 }}>
              {loading ? 'Resetting...' : '🔑 Reset Password'}
            </button>
            <button type="button" onClick={() => { setStep('email'); setError(''); setInfo(''); setOtp('') }} style={{ background: 'none', border: 'none', color: '#8888aa', fontSize: '13px', cursor: 'pointer', textAlign: 'center' }}>← Back</button>
          </form>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#4ade80', fontSize: '15px', marginBottom: '20px', fontFamily: 'Poppins, sans-serif' }}>Password reset successfully!</p>
            <button onClick={() => navigate('/login')} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: 'linear-gradient(90deg, #e8187a, #9b20d8)', color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '16px', fontWeight: 700 }}>
              Sign In Now
            </button>
          </div>
        )}

        {step !== 'done' && (
          <p style={{ textAlign: 'center', marginTop: '20px', color: '#8888aa', fontSize: '14px' }}>
            <span onClick={() => navigate('/login')} style={{ color: '#f0a500', cursor: 'pointer', fontWeight: 600 }}>← Back to Sign In</span>
          </p>
        )}
      </div>
    </div>
  )
}
