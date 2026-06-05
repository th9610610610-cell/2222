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
  const accNumber = user?.id ? `ACC #${String(user.id).padStart(5, '0')}` : 'ACC #00001'

  const menuItems = [
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="7" width="20" height="10" rx="2" stroke="#f0a500" strokeWidth="2"/>
          <path d="M15 7V17M9 7V17" stroke="#f0a500" strokeWidth="1.5" strokeDasharray="2 2"/>
        </svg>
      ),
      label: 'My Tickets', sub: 'View all your tickets', path: '/my-tickets', color: '#f0a500', bg: 'rgba(240,165,0,0.12)',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="6" width="20" height="13" rx="2" stroke="#9b20d8" strokeWidth="2"/>
          <path d="M2 10H22" stroke="#9b20d8" strokeWidth="2"/>
          <rect x="15" y="13" width="4" height="3" rx="1" fill="#9b20d8"/>
        </svg>
      ),
      label: 'Wallet', sub: 'Balance & transactions', path: '/wallet', color: '#9b20d8', bg: 'rgba(155,32,216,0.12)',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="#22d3ee" strokeWidth="2"/>
          <path d="M12 8V12L15 14" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      label: 'Add Money', sub: 'bKash · Nagad · Rocket', path: '/deposit', color: '#22d3ee', bg: 'rgba(34,211,238,0.12)',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#f472b6" strokeWidth="2" strokeLinecap="round"/>
          <path d="M13.73 21a2 2 0 01-3.46 0" stroke="#f472b6" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      label: 'Notifications', sub: `${notifications.length} unread`, path: '', color: '#f472b6', bg: 'rgba(244,114,182,0.12)',
    },
  ]

  return (
    <div className="app">
      <TopNav />
      <div style={{ padding: '16px 16px 120px' }}>

        {/* ── Profile Hero Card ── */}
        <div style={{
          background: 'linear-gradient(135deg, #1e0d42 0%, #0e1640 60%, #0a1535 100%)',
          borderRadius: '20px',
          boxShadow: '0 0 0 1.5px rgba(155,32,216,0.45)',
          padding: '24px 20px', marginBottom: '14px',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Background glow */}
          <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '130px', height: '130px', background: 'radial-gradient(circle, rgba(155,32,216,0.25) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: '70px', height: '70px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #f0a500, #e8187a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '28px', fontWeight: 800, color: '#fff', fontFamily: 'Poppins, sans-serif',
                boxShadow: '0 0 0 3px rgba(240,165,0,0.3)',
              }}>{initial}</div>
              <div style={{
                position: 'absolute', bottom: 2, right: 2,
                width: '16px', height: '16px', borderRadius: '50%',
                background: '#22d3ee', border: '2px solid #0e1640',
              }} />
            </div>

            {/* Name & phone */}
            <div style={{ flex: 1 }}>
              {editing ? (
                <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                  <input value={name} onChange={e => setName(e.target.value)}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(155,32,216,0.4)', borderRadius: '10px', padding: '8px 12px', color: '#fff', fontSize: '14px', outline: 'none', fontFamily: 'Poppins, sans-serif' }} />
                  <button onClick={saveName} disabled={saving} style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'linear-gradient(90deg,#f0a500,#e8187a)', color: '#fff', fontWeight: 700, fontSize: '13px', fontFamily: 'Poppins, sans-serif' }}>{saving ? '…' : 'Save'}</button>
                  <button onClick={() => setEditing(false)} style={{ padding: '8px 10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', background: 'transparent', color: '#aaa', fontSize: '13px' }}>✕</button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h2 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#fff', fontSize: '18px', margin: 0 }}>{user?.full_name}</h2>
                  <span onClick={() => setEditing(true)} style={{ color: '#9b20d8', cursor: 'pointer', fontSize: '15px' }}>✏️</span>
                </div>
              )}
              <p style={{ color: '#8888aa', fontSize: '13px', fontFamily: 'Poppins, sans-serif', marginBottom: '6px' }}>📞 {user?.phone}</p>
              <p style={{ color: '#6060a0', fontSize: '12px', fontFamily: 'Poppins, sans-serif' }}>{accNumber}</p>
            </div>
          </div>

          {/* Role badge */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ background: 'rgba(155,32,216,0.2)', color: '#9b20d8', borderRadius: '20px', padding: '4px 14px', fontSize: '11px', fontWeight: 700, fontFamily: 'Poppins, sans-serif', letterSpacing: '0.5px' }}>{(user?.role || 'USER').toUpperCase()}</span>
            {user?.is_flagged && <span style={{ background: 'rgba(232,24,122,0.2)', color: '#e8187a', borderRadius: '20px', padding: '4px 14px', fontSize: '11px', fontWeight: 700, fontFamily: 'Poppins, sans-serif' }}>⚠️ FLAGGED</span>}
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
          {[
            { label: 'Balance', value: formatCurrency(user?.balance || 0), color: '#f0a500', icon: '৳' },
            { label: 'Total Won', value: formatCurrency(user?.total_won || 0), color: '#4ade80', icon: '🏆' },
            { label: 'Deposited', value: formatCurrency(user?.total_deposited || 0), color: '#9b20d8', icon: '⬆️' },
            { label: 'Tickets', value: String(user?.tickets_bought || 0), color: '#e8187a', icon: '🎟️' },
          ].map(({ label, value, color, icon }) => (
            <div key={label} style={{
              background: '#13112e', borderRadius: '16px',
              border: '1px solid rgba(155,32,216,0.18)',
              padding: '16px', position: 'relative', overflow: 'hidden',
            }}>
              <p style={{ color: '#7878a8', fontSize: '11px', fontFamily: 'Poppins, sans-serif', fontWeight: 500, marginBottom: '8px', letterSpacing: '0.5px' }}>{label.toUpperCase()}</p>
              <p style={{ color, fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: '18px' }}>{value}</p>
              <span style={{ position: 'absolute', bottom: '10px', right: '12px', fontSize: '20px', opacity: 0.25 }}>{icon}</span>
            </div>
          ))}
        </div>

        {/* ── Menu Items ── */}
        <div style={{ background: '#13112e', borderRadius: '18px', border: '1px solid rgba(155,32,216,0.18)', overflow: 'hidden', marginBottom: '14px' }}>
          {menuItems.map((item, i) => (
            <div key={item.label} onClick={() => item.path && navigate(item.path)} style={{
              padding: '15px 18px',
              display: 'flex', alignItems: 'center', gap: '14px',
              cursor: item.path ? 'pointer' : 'default',
              borderBottom: i < menuItems.length - 1 ? '1px solid rgba(155,32,216,0.1)' : 'none',
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: item.bg, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{item.icon}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, color: '#fff', fontSize: '14px', marginBottom: '2px' }}>{item.label}</p>
                <p style={{ color: '#7878a8', fontSize: '12px', fontFamily: 'Poppins, sans-serif' }}>{item.sub}</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 18L15 12L9 6" stroke="#6060a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          ))}
        </div>

        {/* ── Recent Notifications ── */}
        {notifications.length > 0 && (
          <>
            <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#fff', fontSize: '15px', marginBottom: '10px' }}>🔔 Recent Notifications</p>
            {notifications.slice(0, 3).map(n => (
              <div key={n.id} style={{
                background: '#13112e', borderRadius: '14px',
                border: '1px solid rgba(155,32,216,0.15)',
                padding: '14px 16px', marginBottom: '8px',
                display: 'flex', gap: '12px', alignItems: 'flex-start',
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e8187a', marginTop: '5px', flexShrink: 0 }} />
                <div>
                  <p style={{ color: '#ddd', fontSize: '13px', lineHeight: '1.5', fontFamily: 'Poppins, sans-serif', marginBottom: '4px' }}>{n.message}</p>
                  <p style={{ color: '#6060a0', fontSize: '11px', fontFamily: 'Poppins, sans-serif' }}>{formatDate(n.created_at)}</p>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── Sign Out ── */}
        <button onClick={handleLogout} style={{
          width: '100%', padding: '15px', borderRadius: '50px',
          border: '1.5px solid rgba(232,24,122,0.4)', cursor: 'pointer',
          background: 'rgba(232,24,122,0.08)', color: '#e8187a',
          fontFamily: 'Poppins, sans-serif', fontSize: '15px', fontWeight: 700,
          marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="#e8187a" strokeWidth="2" strokeLinecap="round"/>
            <path d="M16 17L21 12L16 7" stroke="#e8187a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21 12H9" stroke="#e8187a" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Sign Out
        </button>
      </div>
      <BottomNav />
    </div>
  )
}
