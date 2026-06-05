import { useLocation } from 'wouter'
import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

export default function TopNav() {
  const [, navigate] = useLocation()
  const { user, token } = useAuth()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!token) return
    fetch(`${BASE}/api/user/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(d => {
      if (d.notifications) {
        setUnread(d.notifications.filter((n: any) => !n.is_read).length)
      }
    }).catch(() => {})
  }, [token])

  const initial = user?.full_name?.charAt(0).toUpperCase() || 'U'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '18px 18px 14px',
      borderBottom: '1.5px solid',
      borderImage: 'linear-gradient(90deg, #c8006a 0%, #7b00cc 100%) 1',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
        <span style={{ color: '#f0a500', fontSize: '22px' }}>♛</span>
        <span style={{
          fontFamily: 'Poppins, sans-serif', fontSize: '22px', fontWeight: 700,
          background: 'linear-gradient(90deg, #f0a500 0%, #e8187a 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>Lotto Win</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => navigate('/notifications')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white" opacity="0.9">
            <path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 002 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4a1.5 1.5 0 00-3 0v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
          </svg>
          {unread > 0 && (
            <span style={{
              position: 'absolute', top: '-4px', right: '-5px',
              background: '#e8187a', color: '#fff', borderRadius: '50%',
              width: '17px', height: '17px', fontSize: '10px', fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{unread > 9 ? '9+' : unread}</span>
          )}
        </div>
        <div onClick={() => navigate('/profile')} style={{
          width: '40px', height: '40px',
          background: 'linear-gradient(135deg, #f0a500 0%, #e85e00 100%)',
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Poppins, sans-serif', fontSize: '18px', fontWeight: 800, color: '#fff',
          cursor: 'pointer',
        }}>{initial}</div>
      </div>
    </div>
  )
}
