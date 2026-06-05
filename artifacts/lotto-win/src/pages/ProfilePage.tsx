import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { useAuth } from '../lib/auth'
import TopNav from '../components/TopNav'
import BottomNav from '../components/BottomNav'
import { Notification } from '../types'
import { formatCurrency, formatDate } from '../lib/utils'

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

export default function ProfilePage() {
  const [, navigate] = useLocation()
  const { user, token, logout, refresh } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user?.full_name || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    setName(user?.full_name || '')
    fetch(`${BASE}/api/user/notifications`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setNotifications(d.notifications || []))
    // Mark all as read
    fetch(`${BASE}/api/user/notifications`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } })
  }, [token, user?.full_name])

  const saveName = async () => {
    setSaving(true)
    await fetch(`${BASE}/api/user/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ full_name: name }),
    })
    await refresh()
    setSaving(false)
    setEditing(false)
  }

  const handleLogout = () => { logout(); navigate('/login') }

  const initial = user?.full_name?.charAt(0).toUpperCase() || 'U'

  return (
    <div className="app">
      <TopNav />
      <div style={{ padding: '18px 18px 100px' }}>
        {/* Profile header */}
        <div style={{ background: 'linear-gradient(135deg, #1a0b3e, #0d1a3e)', borderRadius: '20px', border: '1px solid rgba(155,32,216,0.3)', padding: '24px', marginBottom: '20px', textAlign: 'center' }}>
          <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'linear-gradient(135deg, #f0a500, #e8187a)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: '28px', fontWeight: 800, color: '#fff', fontFamily: 'Poppins, sans-serif' }}>{initial}</div>
          {editing ? (
            <div style={{ display: 'flex', gap: '8px', maxWidth: '260px', margin: '0 auto 10px' }}>
              <input value={name} onChange={e => setName(e.target.value)} style={{ flex: 1, background: '#08071a', border: '1px solid rgba(155,32,216,0.4)', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '14px', outline: 'none' }} />
              <button onClick={saveName} disabled={saving} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#e8187a', color: '#fff', fontWeight: 700, fontSize: '13px' }}>{saving ? '...' : 'Save'}</button>
              <button onClick={() => setEditing(false)} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', background: 'transparent', color: '#fff', fontSize: '13px' }}>✕</button>
            </div>
          ) : (
            <div style={{ marginBottom: '6px' }}>
              <h2 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#fff', fontSize: '18px', display: 'inline' }}>{user?.full_name}</h2>
              <span onClick={() => setEditing(true)} style={{ marginLeft: '8px', color: '#9b20d8', cursor: 'pointer', fontSize: '14px' }}>✏️</span>
            </div>
          )}
          <p style={{ color: '#8888aa', fontSize: '14px', marginBottom: '14px' }}>📞 {user?.phone}</p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <span style={{ background: 'rgba(155,32,216,0.2)', color: '#9b20d8', borderRadius: '20px', padding: '3px 12px', fontSize: '12px', fontWeight: 700 }}>{user?.role?.toUpperCase()}</span>
            {user?.is_flagged && <span style={{ background: 'rgba(232,24,122,0.2)', color: '#e8187a', borderRadius: '20px', padding: '3px 12px', fontSize: '12px', fontWeight: 700 }}>⚠️ FLAGGED</span>}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Balance', value: formatCurrency(user?.balance || 0), color: '#f0a500' },
            { label: 'Total Won', value: formatCurrency(user?.total_won || 0), color: '#4f4' },
            { label: 'Deposited', value: formatCurrency(user?.total_deposited || 0), color: '#9b20d8' },
            { label: 'Tickets', value: user?.tickets_bought || 0, color: '#e8187a' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: '#100f28', borderRadius: '14px', border: '1px solid rgba(155,32,216,0.2)', padding: '14px', textAlign: 'center' }}>
              <p style={{ color: '#8888aa', fontSize: '12px', marginBottom: '6px' }}>{label}</p>
              <p style={{ color, fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '17px' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div style={{ background: '#100f28', borderRadius: '16px', border: '1px solid rgba(155,32,216,0.2)', overflow: 'hidden', marginBottom: '20px' }}>
          {[
            { label: '🎟️ My Tickets', path: '/my-tickets' },
            { label: '👛 Wallet', path: '/wallet' },
            { label: '💳 Add Money', path: '/deposit' },
          ].map((item, i) => (
            <div key={item.path} onClick={() => navigate(item.path)} style={{
              padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
              borderBottom: i < 2 ? '1px solid rgba(155,32,216,0.15)' : 'none',
            }}>
              <span style={{ color: '#fff', fontSize: '14px' }}>{item.label}</span>
              <span style={{ color: '#8888aa' }}>›</span>
            </div>
          ))}
        </div>

        {/* Notifications */}
        {notifications.length > 0 && (
          <>
            <h3 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#fff', fontSize: '16px', marginBottom: '12px' }}>🔔 Notifications</h3>
            {notifications.map(n => (
              <div key={n.id} style={{ background: '#100f28', borderRadius: '12px', border: '1px solid rgba(155,32,216,0.2)', padding: '14px', marginBottom: '8px' }}>
                <p style={{ color: '#ddd', fontSize: '14px', lineHeight: '1.5', marginBottom: '6px' }}>{n.message}</p>
                <p style={{ color: '#8888aa', fontSize: '11px' }}>{formatDate(n.created_at)}</p>
              </div>
            ))}
          </>
        )}

        {/* Logout */}
        <button onClick={handleLogout} style={{
          width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid rgba(232,24,122,0.4)', cursor: 'pointer',
          background: 'rgba(232,24,122,0.1)', color: '#e8187a',
          fontFamily: 'Poppins, sans-serif', fontSize: '15px', fontWeight: 700, marginTop: '16px',
        }}>Sign Out</button>
      </div>
      <BottomNav />
    </div>
  )
}
