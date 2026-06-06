import { useState } from 'react'
import { useLocation } from 'wouter'

import { API_BASE } from '../lib/apiBase'
const BASE = API_BASE

export default function AdminLoginPage() {
  const [, navigate] = useLocation()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Login failed'); return }
    if (!['admin', 'moderator'].includes(data.user?.role)) {
      setError('Access denied. Admin only.'); return
    }
    localStorage.setItem('lw_token', data.token)
    navigate('/admin')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#08071a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '8px' }}>🔐</div>
        <h1 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '22px', fontWeight: 800, color: '#fff' }}>Admin Control Center</h1>
        <p style={{ color: '#8888aa', fontSize: '14px', marginTop: '6px' }}>Secure administrator access only</p>
      </div>

      <div style={{ width: '100%', maxWidth: '360px', background: '#100f28', borderRadius: '16px', border: '1px solid rgba(155,32,216,0.3)', padding: '28px 24px' }}>
        {error && <div style={{ background: 'rgba(232,24,122,0.15)', border: '1px solid rgba(232,24,122,0.4)', borderRadius: '8px', padding: '12px', color: '#f88', fontSize: '14px', marginBottom: '16px' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'block' }}>Admin Username</label>
            <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="admin" required
              style={{ width: '100%', background: '#08071a', border: '1px solid rgba(155,32,216,0.3)', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'block' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
              style={{ width: '100%', background: '#08071a', border: '1px solid rgba(155,32,216,0.3)', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '14px', borderRadius: '12px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            background: 'linear-gradient(90deg, #9b20d8, #e8187a)', color: '#fff',
            fontFamily: 'Poppins, sans-serif', fontSize: '16px', fontWeight: 700, opacity: loading ? 0.7 : 1,
          }}>
            {loading ? 'Verifying...' : 'Access Admin Panel'}
          </button>
        </form>
      </div>
    </div>
  )
}
