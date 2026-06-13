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

type Step = 'phone' | 'otp' | 'password' | 'done'

export default function ForgotPasswordPage() {
  const [, navigate] = useLocation()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [error, setError] = useState('')
  const [resendMsg, setResendMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendKey, setResendKey] = useState(0)

  const steps: Step[] = ['phone', 'otp', 'password', 'done']
  const stepIdx = steps.indexOf(step)
  const stepLabel = ['Phone', 'Verify', 'Password', 'Done']

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    const res = await fetch(`${BASE}/api/auth/reset-password/request`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Request failed'); return }
    if (data.email) setMaskedEmail(data.email.replace(/(.{2}).+(@.+)/, '$1***$2'))
    setStep('otp')
  }

  const handleResend = async () => {
    setError(''); setResendMsg(''); setLoading(true)
    const res = await fetch(`${BASE}/api/auth/reset-password/request`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(data.error || 'Could not resend OTP')
      return
    }
    setResendMsg('OTP resent! Check your inbox.')
    setResendKey(k => k + 1)
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length < 6) { setError('Enter the 6-digit OTP'); return }
    setError(''); setStep('password')
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return }
    setError(''); setLoading(true)
    const res = await fetch(`${BASE}/api/auth/reset-password/confirm`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp, new_password: newPassword }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Reset failed'); return }
    setStep('done')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#08071a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ marginBottom: '28px', textAlign: 'center' }}>
        <span style={{ fontSize: '36px' }}>🔑</span>
        <h1 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '24px', fontWeight: 800, color: '#fff', margin: '8px 0 4px' }}>Reset Password</h1>
        <p style={{ color: '#8888aa', fontSize: '14px' }}>Recover access to your account</p>
      </div>

      {/* Step dots */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '20px' }}>
        {stepLabel.slice(0, 3).map((label, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 700,
              background: stepIdx > i ? 'linear-gradient(135deg,#22c55e,#16a34a)' : stepIdx === i ? 'linear-gradient(135deg,#9b20d8,#e8187a)' : 'rgba(155,32,216,0.15)',
              color: '#fff',
            }}>{stepIdx > i ? '✓' : i + 1}</div>
            <span style={{ fontSize: '11px', color: stepIdx === i ? '#ccc' : '#555' }}>{label}</span>
            {i < 2 && <div style={{ width: '20px', height: '2px', background: stepIdx > i ? '#22c55e' : 'rgba(155,32,216,0.2)', borderRadius: '2px', margin: '0 2px' }} />}
          </div>
        ))}
      </div>

      <div style={{ width: '100%', maxWidth: '360px', background: '#100f28', borderRadius: '16px', border: '1px solid rgba(155,32,216,0.2)', padding: '28px 24px' }}>
        {error && <div style={{ background: 'rgba(232,24,122,0.12)', border: '1px solid rgba(232,24,122,0.4)', borderRadius: '8px', padding: '10px 12px', color: '#f88', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}
        {resendMsg && <div style={{ background: 'rgba(240,165,0,0.1)', border: '1px solid rgba(240,165,0,0.4)', borderRadius: '8px', padding: '10px 12px', color: '#f0a500', fontSize: '13px', marginBottom: '16px' }}>{resendMsg}</div>}

        {step === 'phone' && (
          <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'block' }}>Registered Phone Number</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="01XXXXXXXXX" required style={inputStyle} />
              <p style={{ color: '#666', fontSize: '11px', marginTop: '4px' }}>OTP will be sent to your registered email</p>
            </div>
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              background: loading ? 'rgba(155,32,216,0.3)' : 'linear-gradient(90deg,#9b20d8,#e8187a)',
              color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '15px', fontWeight: 700, opacity: loading ? 0.7 : 1,
            }}>
              {loading ? 'Sending...' : 'Send Reset OTP →'}
            </button>
            <p style={{ textAlign: 'center', color: '#8888aa', fontSize: '13px', margin: 0 }}>
              Remembered it?{' '}
              <span onClick={() => navigate('/login')} style={{ color: '#f0a500', cursor: 'pointer', fontWeight: 600 }}>Sign In</span>
            </p>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>📧</div>
              <p style={{ color: '#ccc', fontSize: '14px', lineHeight: 1.6 }}>
                Reset code sent to<br />
                <strong style={{ color: '#f0a500' }}>{maskedEmail || 'your email'}</strong>
              </p>
              <p style={{ color: '#8888aa', fontSize: '12px', marginTop: '6px' }}>Check spam/junk if not in inbox</p>
            </div>
            <OtpInput value={otp} onChange={v => { setOtp(v); setError('') }} disabled={loading} />
            <OtpTimer key={resendKey} seconds={120} onResend={handleResend} loading={loading} />
            <button type="submit" disabled={otp.length < 6} style={{
              width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
              cursor: otp.length < 6 ? 'not-allowed' : 'pointer',
              background: otp.length < 6 ? 'rgba(155,32,216,0.3)' : 'linear-gradient(90deg,#9b20d8,#e8187a)',
              color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '15px', fontWeight: 700, opacity: otp.length < 6 ? 0.7 : 1,
            }}>
              Confirm Code →
            </button>
            <button type="button" onClick={() => { setStep('phone'); setOtp(''); setError(''); setResendMsg('') }}
              style={{ background: 'none', border: 'none', color: '#8888aa', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}>
              ← Change phone number
            </button>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '4px' }}>
              <div style={{ fontSize: '36px' }}>🔒</div>
              <p style={{ color: '#aaa', fontSize: '13px' }}>Create your new password</p>
            </div>
            <div>
              <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'block' }}>New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min 8 chars, upper, lower, number, symbol"
                  required
                  style={{ ...inputStyle, paddingRight: '42px' }}
                />
                <button type="button" onClick={() => setShowNewPw(v => !v)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8888aa', cursor: 'pointer', fontSize: '16px', padding: '2px' }}>
                  {showNewPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <div>
              <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'block' }}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  required
                  style={{ ...inputStyle, paddingRight: '42px' }}
                />
                <button type="button" onClick={() => setShowConfirmPw(v => !v)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8888aa', cursor: 'pointer', fontSize: '16px', padding: '2px' }}>
                  {showConfirmPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Password strength hints */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {[
                { label: '8+ chars', ok: newPassword.length >= 8 },
                { label: 'Uppercase', ok: /[A-Z]/.test(newPassword) },
                { label: 'Lowercase', ok: /[a-z]/.test(newPassword) },
                { label: 'Number', ok: /\d/.test(newPassword) },
                { label: 'Symbol', ok: /[@$!%*?&_\-#]/.test(newPassword) },
              ].map(({ label, ok }) => (
                <span key={label} style={{
                  fontSize: '11px', padding: '2px 8px', borderRadius: '20px',
                  background: ok ? 'rgba(34,197,94,0.15)' : 'rgba(155,32,216,0.1)',
                  color: ok ? '#6ee7a0' : '#8888aa',
                  border: `1px solid ${ok ? 'rgba(34,197,94,0.4)' : 'rgba(155,32,216,0.2)'}`,
                }}>{ok ? '✓' : '○'} {label}</span>
              ))}
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              background: loading ? 'rgba(155,32,216,0.3)' : 'linear-gradient(90deg,#9b20d8,#e8187a)',
              color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '15px', fontWeight: 700, opacity: loading ? 0.7 : 1,
            }}>
              {loading ? 'Resetting...' : 'Reset Password ✓'}
            </button>
          </form>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <div style={{ fontSize: '64px' }}>🎉</div>
            <h3 style={{ color: '#fff', margin: 0 }}>Password Reset!</h3>
            <p style={{ color: '#aaa', fontSize: '14px', margin: 0 }}>Your password has been updated successfully.</p>
            <button onClick={() => navigate('/login')} style={{
              width: '100%', padding: '14px', borderRadius: '12px', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(90deg, #e8187a, #9b20d8)',
              color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '16px', fontWeight: 700,
            }}>
              Sign In Now →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
