import { useState } from 'react'
import { useLocation } from 'wouter'

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

export default function RegisterPage() {
  const [, navigate] = useLocation()
  const [form, setForm] = useState({ full_name: '', phone: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Registration failed'); return }
    navigate('/login')
  }

  const inp = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#08071a', border: '1px solid rgba(155,32,216,0.3)',
    borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#08071a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <span style={{ fontSize: '36px' }}>♛</span>
        <h1 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '28px', fontWeight: 800, background: 'linear-gradient(90deg, #f0a500, #e8187a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '8px 0 4px' }}>Create Account</h1>
        <p style={{ color: '#8888aa', fontSize: '14px' }}>Join Lotto Win today</p>
      </div>
      <div style={{ width: '100%', maxWidth: '360px', background: '#100f28', borderRadius: '16px', border: '1px solid rgba(155,32,216,0.2)', padding: '28px 24px' }}>
        {error && <div style={{ background: 'rgba(232,24,122,0.15)', border: '1px solid rgba(232,24,122,0.4)', borderRadius: '8px', padding: '12px', color: '#f88', fontSize: '14px', marginBottom: '16px' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'block' }}>Full Name</label>
            <input type="text" value={form.full_name} onChange={e => inp('full_name', e.target.value)} placeholder="Your full name" required style={inputStyle} />
          </div>
          <div>
            <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'block' }}>Phone Number</label>
            <input type="tel" value={form.phone} onChange={e => inp('phone', e.target.value)} placeholder="01XXXXXXXXX" required style={inputStyle} />
          </div>
          <div>
            <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'block' }}>Password</label>
            <input type="password" value={form.password} onChange={e => inp('password', e.target.value)} placeholder="Min 6 characters" required style={inputStyle} />
          </div>
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '14px', borderRadius: '12px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            background: 'linear-gradient(90deg, #f0a500, #e8187a)', color: '#fff',
            fontFamily: 'Poppins, sans-serif', fontSize: '16px', fontWeight: 700, opacity: loading ? 0.7 : 1,
          }}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '20px', color: '#8888aa', fontSize: '14px' }}>
          Already have an account?{' '}
          <span onClick={() => navigate('/login')} style={{ color: '#f0a500', cursor: 'pointer', fontWeight: 600 }}>Sign In</span>
        </p>
      </div>
    </div>
  )
}
