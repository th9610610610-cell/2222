import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { useAuth } from '../lib/auth'
import TopNav from '../components/TopNav'
import BottomNav from '../components/BottomNav'
import { Notification } from '../types'
import { formatCurrency, formatDate } from '../lib/utils'

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

type EditSection = 'name' | 'phone' | 'password' | null

export default function ProfilePage() {
  const [, navigate] = useLocation()
  const { user, token, logout, refresh } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [editSection, setEditSection] = useState<EditSection>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    setName(user?.full_name || '')
    setPhone(user?.phone || '')
    fetch(`${BASE}/api/user/notifications`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setNotifications(d.notifications || []))
    fetch(`${BASE}/api/user/notifications`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } })
  }, [token, user?.full_name])

  const saveSection = async () => {
    setSaving(true); setMsg(null)
    const body: Record<string, string> = {}
    if (editSection === 'name') body.full_name = name
    if (editSection === 'phone') body.phone = phone
    if (editSection === 'password') { body.current_password = currentPw; body.new_password = newPw }
    const res = await fetch(`${BASE}/api/user/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) { setMsg({ text: data.error || 'Failed', ok: false }) }
    else { await refresh(); setMsg({ text: 'Updated!', ok: true }); setEditSection(null); setCurrentPw(''); setNewPw('') }
    setSaving(false)
  }

  const handleLogout = () => { logout(); navigate('/login') }
  const initial = user?.full_name?.charAt(0).toUpperCase() || 'U'
  const uid = user?.id ? parseInt(String(user.id), 10) : NaN
  const accNumber = user?.id
    ? `ACC#${!isNaN(uid) ? 1000 + uid : String(user.id).replace(/\D/g, '').slice(-4).padStart(4, '0')}`
    : 'ACC#----'

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(155,32,216,0.4)',
    borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '14px',
    outline: 'none', fontFamily: 'Poppins, sans-serif', boxSizing: 'border-box', marginBottom: '10px',
  }

  const editCardStyle: React.CSSProperties = {
    background: '#1a1640', borderRadius: '14px', border: '1px solid rgba(155,32,216,0.3)',
    padding: '16px', marginBottom: '10px',
  }

  return (
    <div className="app">
      <TopNav />
      <div style={{ padding: '16px 16px 120px' }}>

        {/* ── Profile Hero Card ── */}
        <div style={{
          background: 'linear-gradient(135deg, #1e0d42 0%, #0e1640 60%, #0a1535 100%)',
          borderRadius: '20px', boxShadow: '0 0 0 1.5px rgba(155,32,216,0.45)',
          padding: '24px 20px', marginBottom: '14px', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '130px', height: '130px', background: 'radial-gradient(circle, rgba(155,32,216,0.25) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'linear-gradient(135deg, #f0a500, #e8187a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 800, color: '#fff', fontFamily: 'Poppins, sans-serif', boxShadow: '0 0 0 3px rgba(240,165,0,0.3)' }}>{initial}</div>
              <div style={{ position: 'absolute', bottom: 2, right: 2, width: '16px', height: '16px', borderRadius: '50%', background: '#22d3ee', border: '2px solid #0e1640' }} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#fff', fontSize: '18px', margin: '0 0 4px' }}>{user?.full_name}</h2>
              <p style={{ color: '#8888aa', fontSize: '13px', fontFamily: 'Poppins, sans-serif', marginBottom: '4px' }}>📞 {user?.phone}</p>
              <p style={{ color: '#6060a0', fontSize: '12px', fontFamily: 'Poppins, sans-serif' }}>{accNumber}</p>
            </div>
          </div>
          <span style={{ background: 'rgba(155,32,216,0.2)', color: '#9b20d8', borderRadius: '20px', padding: '4px 14px', fontSize: '11px', fontWeight: 700, fontFamily: 'Poppins, sans-serif', letterSpacing: '0.5px' }}>{(user?.role || 'USER').toUpperCase()}</span>
          {user?.is_flagged && <span style={{ background: 'rgba(232,24,122,0.2)', color: '#e8187a', borderRadius: '20px', padding: '4px 14px', fontSize: '11px', fontWeight: 700, fontFamily: 'Poppins, sans-serif', marginLeft: '8px' }}>⚠️ FLAGGED</span>}
        </div>

        {/* ── Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
          {[
            { label: 'BALANCE', value: formatCurrency(user?.balance || 0), color: '#f0a500' },
            { label: 'TOTAL WON', value: formatCurrency(user?.total_won || 0), color: '#4ade80' },
            { label: 'DEPOSITED', value: formatCurrency(user?.total_deposited || 0), color: '#9b20d8' },
            { label: 'TICKETS', value: String(user?.tickets_bought || 0), color: '#e8187a' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: '#13112e', borderRadius: '16px', border: '1px solid rgba(155,32,216,0.18)', padding: '16px' }}>
              <p style={{ color: '#7878a8', fontSize: '10px', fontFamily: 'Poppins, sans-serif', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.8px' }}>{label}</p>
              <p style={{ color, fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: '17px' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* ── Edit Sections ── */}
        <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#fff', fontSize: '14px', marginBottom: '10px' }}>Account Settings</p>

        {msg && (
          <div style={{ background: msg.ok ? 'rgba(74,222,128,0.15)' : 'rgba(232,24,122,0.15)', border: `1px solid ${msg.ok ? '#4ade80' : '#e8187a'}`, borderRadius: '10px', padding: '10px 14px', marginBottom: '10px', color: msg.ok ? '#4ade80' : '#e8187a', fontFamily: 'Poppins, sans-serif', fontSize: '13px' }}>
            {msg.text}
          </div>
        )}

        {/* Update Name */}
        <div style={editCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setEditSection(editSection === 'name' ? null : 'name')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>✏️</span>
              <div>
                <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, color: '#fff', fontSize: '14px' }}>Full Name</p>
                <p style={{ color: '#7878a8', fontSize: '12px', fontFamily: 'Poppins, sans-serif' }}>{user?.full_name}</p>
              </div>
            </div>
            <span style={{ color: '#9b20d8', fontSize: '18px' }}>{editSection === 'name' ? '▲' : '▼'}</span>
          </div>
          {editSection === 'name' && (
            <div style={{ marginTop: '14px' }}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" style={inputStyle} />
              <button onClick={saveSection} disabled={saving} style={{ width: '100%', padding: '11px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'linear-gradient(90deg,#f0a500,#e8187a)', color: '#fff', fontWeight: 700, fontFamily: 'Poppins, sans-serif' }}>{saving ? 'Saving…' : 'Save Name'}</button>
            </div>
          )}
        </div>

        {/* Update Phone */}
        <div style={editCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setEditSection(editSection === 'phone' ? null : 'phone')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>📞</span>
              <div>
                <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, color: '#fff', fontSize: '14px' }}>Phone Number</p>
                <p style={{ color: '#7878a8', fontSize: '12px', fontFamily: 'Poppins, sans-serif' }}>{user?.phone}</p>
              </div>
            </div>
            <span style={{ color: '#22d3ee', fontSize: '18px' }}>{editSection === 'phone' ? '▲' : '▼'}</span>
          </div>
          {editSection === 'phone' && (
            <div style={{ marginTop: '14px' }}>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="01XXXXXXXXX" style={inputStyle} />
              <button onClick={saveSection} disabled={saving} style={{ width: '100%', padding: '11px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'linear-gradient(90deg,#22d3ee,#9b20d8)', color: '#fff', fontWeight: 700, fontFamily: 'Poppins, sans-serif' }}>{saving ? 'Saving…' : 'Save Number'}</button>
            </div>
          )}
        </div>

        {/* Update Password */}
        <div style={editCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setEditSection(editSection === 'password' ? null : 'password')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>🔒</span>
              <div>
                <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, color: '#fff', fontSize: '14px' }}>Password</p>
                <p style={{ color: '#7878a8', fontSize: '12px', fontFamily: 'Poppins, sans-serif' }}>Change your password</p>
              </div>
            </div>
            <span style={{ color: '#f472b6', fontSize: '18px' }}>{editSection === 'password' ? '▲' : '▼'}</span>
          </div>
          {editSection === 'password' && (
            <div style={{ marginTop: '14px' }}>
              <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Current password" style={inputStyle} />
              <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="New password (min 6 chars)" style={inputStyle} />
              <button onClick={saveSection} disabled={saving || newPw.length < 6} style={{ width: '100%', padding: '11px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'linear-gradient(90deg,#e8187a,#9b20d8)', color: '#fff', fontWeight: 700, fontFamily: 'Poppins, sans-serif', opacity: newPw.length < 6 ? 0.5 : 1 }}>{saving ? 'Saving…' : 'Change Password'}</button>
            </div>
          )}
        </div>

        {/* Quick Nav */}
        <div style={{ background: '#13112e', borderRadius: '18px', border: '1px solid rgba(155,32,216,0.18)', overflow: 'hidden', marginBottom: '14px', marginTop: '4px' }}>
          {[
            { emoji: '🎟️', label: 'My Tickets', sub: 'View all tickets', path: '/my-tickets' },
            { emoji: '👛', label: 'Wallet', sub: 'Balance & history', path: '/wallet' },
            { emoji: '💳', label: 'Add Money', sub: 'bKash · Nagad · Rocket', path: '/deposit' },
          ].map((item, i) => (
            <div key={item.path} onClick={() => navigate(item.path)} style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: i < 2 ? '1px solid rgba(155,32,216,0.1)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>{item.emoji}</span>
                <div>
                  <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, color: '#fff', fontSize: '14px' }}>{item.label}</p>
                  <p style={{ color: '#7878a8', fontSize: '12px', fontFamily: 'Poppins, sans-serif' }}>{item.sub}</p>
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18L15 12L9 6" stroke="#6060a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          ))}
        </div>

        {/* Notifications */}
        {notifications.length > 0 && (
          <>
            <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#fff', fontSize: '14px', marginBottom: '10px' }}>🔔 Notifications</p>
            {notifications.slice(0, 3).map(n => (
              <div key={n.id} style={{ background: '#13112e', borderRadius: '14px', border: '1px solid rgba(155,32,216,0.15)', padding: '14px 16px', marginBottom: '8px', display: 'flex', gap: '12px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e8187a', marginTop: '5px', flexShrink: 0 }} />
                <div>
                  <p style={{ color: '#ddd', fontSize: '13px', lineHeight: '1.5', fontFamily: 'Poppins, sans-serif', marginBottom: '4px' }}>{n.message}</p>
                  <p style={{ color: '#6060a0', fontSize: '11px', fontFamily: 'Poppins, sans-serif' }}>{formatDate(n.created_at)}</p>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Sign Out */}
        <button onClick={handleLogout} style={{ width: '100%', padding: '15px', borderRadius: '50px', border: '1.5px solid rgba(232,24,122,0.4)', cursor: 'pointer', background: 'rgba(232,24,122,0.08)', color: '#e8187a', fontFamily: 'Poppins, sans-serif', fontSize: '15px', fontWeight: 700, marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="#e8187a" strokeWidth="2" strokeLinecap="round"/><path d="M16 17L21 12L16 7" stroke="#e8187a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12H9" stroke="#e8187a" strokeWidth="2" strokeLinecap="round"/></svg>
          Sign Out
        </button>
      </div>
      <BottomNav />
    </div>
  )
}
