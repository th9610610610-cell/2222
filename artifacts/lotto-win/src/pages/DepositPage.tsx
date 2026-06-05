import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { useAuth } from '../lib/auth'
import TopNav from '../components/TopNav'
import BottomNav from '../components/BottomNav'
import { Settings } from '../types'

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

export default function DepositPage() {
  const [, navigate] = useLocation()
  const { token } = useAuth()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [form, setForm] = useState({ amount: '', method: 'bkash' as 'bkash' | 'nagad' | 'rocket', sender_phone: '', trx_id: '' })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    fetch(`${BASE}/api/settings`).then(r => r.json()).then(d => setSettings(d.settings))
  }, [token])

  const number = settings ? (form.method === 'bkash' ? settings.bkash_number : form.method === 'nagad' ? settings.nagad_number : settings.rocket_number) : ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setMsg(null)
    const res = await fetch(`${BASE}/api/deposits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setMsg({ type: 'err', text: data.error || 'Submission failed' }); return }
    setMsg({ type: 'ok', text: '✅ Deposit submitted! Awaiting admin approval.' })
    setForm(f => ({ ...f, amount: '', sender_phone: '', trx_id: '' }))
  }

  const inp = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))
  const inputStyle: React.CSSProperties = { width: '100%', background: '#08071a', border: '1px solid rgba(155,32,216,0.3)', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }
  const methods = [{ id: 'bkash', label: 'bKash', emoji: '📱' }, { id: 'nagad', label: 'Nagad', emoji: '💰' }, { id: 'rocket', label: 'Rocket', emoji: '🚀' }]

  return (
    <div className="app">
      <TopNav />
      <div style={{ padding: '18px 18px 100px' }}>
        <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '20px' }}>💳 Add Money</h2>

        {/* Payment method selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          {methods.map(m => (
            <button key={m.id} onClick={() => inp('method', m.id)} style={{
              padding: '14px 8px', borderRadius: '12px', border: `2px solid ${form.method === m.id ? '#e8187a' : 'rgba(155,32,216,0.2)'}`,
              background: form.method === m.id ? 'rgba(232,24,122,0.1)' : '#100f28',
              cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
            }}>
              <span style={{ fontSize: '22px' }}>{m.emoji}</span>
              <span style={{ color: form.method === m.id ? '#e8187a' : '#fff', fontWeight: 600, fontSize: '13px' }}>{m.label}</span>
            </button>
          ))}
        </div>

        {/* Send-to number */}
        {number && (
          <div style={{ background: 'rgba(155,32,216,0.1)', border: '1px solid rgba(155,32,216,0.3)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
            <p style={{ color: '#8888aa', fontSize: '12px', marginBottom: '6px' }}>Send money to this {form.method} number:</p>
            <p style={{ color: '#f0a500', fontWeight: 800, fontSize: '20px', fontFamily: 'monospace', letterSpacing: '2px' }}>{number}</p>
            <p style={{ color: '#8888aa', fontSize: '12px', marginTop: '8px' }}>⚠️ Send first, then fill the form below with your transaction details.</p>
          </div>
        )}

        {msg && (
          <div style={{ background: msg.type === 'ok' ? 'rgba(80,200,80,0.15)' : 'rgba(232,24,122,0.15)', border: `1px solid ${msg.type === 'ok' ? 'rgba(80,200,80,0.4)' : 'rgba(232,24,122,0.4)'}`, borderRadius: '10px', padding: '12px', color: msg.type === 'ok' ? '#4f4' : '#f88', fontSize: '14px', marginBottom: '16px' }}>
            {msg.text}
          </div>
        )}

        <div style={{ background: '#100f28', borderRadius: '16px', border: '1px solid rgba(155,32,216,0.2)', padding: '20px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'block' }}>Amount (৳)</label>
              <input type="number" value={form.amount} onChange={e => inp('amount', e.target.value)} placeholder="250 – 10000" min={250} max={10000} required style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'block' }}>Your {form.method} Number</label>
              <input type="tel" value={form.sender_phone} onChange={e => inp('sender_phone', e.target.value)} placeholder="01XXXXXXXXX" required style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'block' }}>Transaction ID</label>
              <input type="text" value={form.trx_id} onChange={e => inp('trx_id', e.target.value.toUpperCase())} placeholder="e.g. ABC1234567" required style={inputStyle} />
            </div>
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '14px', borderRadius: '12px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              background: 'linear-gradient(90deg, #e8187a, #9b20d8)', color: '#fff',
              fontFamily: 'Poppins, sans-serif', fontSize: '16px', fontWeight: 700, opacity: loading ? 0.7 : 1,
            }}>
              {loading ? 'Submitting...' : 'Submit Deposit Request'}
            </button>
          </form>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
