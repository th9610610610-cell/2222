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
  const { refresh } = useAuth()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Login failed'); return }

    localStorage.setItem('lw_token', data.token)
    await refresh()
    navigate('/')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#08071a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <span style={{ fontSize: '36px' }}>♛</span>
        <h1 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '28px', fontWeight: 800, background: 'linear-gradient(90deg, #f0a500, #e8187a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '8px 0 4px' }}>Lotto Win</h1>
        <p style={{ color: '#8888aa', fontSize: '14px' }}>Sign in to your account</p>
      </div>

      <div style={{ width: '100%', maxWidth: '360px', background: '#100f28', borderRadius: '16px', border: '1px solid rgba(155,32,216,0.2)', padding: '28px 24px' }}>
        {error && (
          <div style={{ background: 'rgba(232,24,122,0.12)', border: '1px solid rgba(232,24,122,0.4)', borderRadius: '8px', padding: '10px 12px', color: '#f88', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'block' }}>Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Password</span>
              <span onClick={() => navigate('/forgot-password')} style={{ color: '#9b20d8', cursor: 'pointer', fontSize: '12px' }}>Forgot password?</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ ...inputStyle, paddingRight: '42px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8888aa', cursor: 'pointer', fontSize: '16px', padding: '2px' }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              background: loading ? 'rgba(155,32,216,0.3)' : 'linear-gradient(90deg, #e8187a, #9b20d8)',
              color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '16px', fontWeight: 700, opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', color: '#8888aa', fontSize: '14px' }}>
          Don't have an account?{' '}
          <span onClick={() => navigate('/register')} style={{ color: '#f0a500', cursor: 'pointer', fontWeight: 600 }}>Register</span>
        </p>
      </div>
    </div>
  )
}
