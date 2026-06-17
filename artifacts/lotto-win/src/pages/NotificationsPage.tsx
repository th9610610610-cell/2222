import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { useAuth } from '../lib/auth'
import BottomNav from '../components/BottomNav'
import { Notification } from '../types'
import { formatDate } from '../lib/utils'

import { API_BASE } from '../lib/apiBase'
const BASE = API_BASE

function typeStyle(msg: string): { icon: string; color: string; bg: string; border: string } {
  if (msg.includes('🎉') || msg.includes('won') || msg.includes('winner'))
    return { icon: '🎉', color: '#f0a500', bg: 'rgba(240,165,0,0.10)', border: 'rgba(240,165,0,0.25)' }
  if (msg.includes('✅') || msg.includes('approved'))
    return { icon: '✅', color: '#4ade80', bg: 'rgba(74,222,128,0.10)', border: 'rgba(74,222,128,0.25)' }
  if (msg.includes('❌') || msg.includes('rejected'))
    return { icon: '❌', color: '#e8187a', bg: 'rgba(232,24,122,0.10)', border: 'rgba(232,24,122,0.25)' }
  if (msg.includes('🔴') || msg.includes('LIVE') || msg.includes('live'))
    return { icon: '🔴', color: '#e8187a', bg: 'rgba(232,24,122,0.10)', border: 'rgba(232,24,122,0.25)' }
  if (msg.includes('🔄') || msg.includes('rescheduled'))
    return { icon: '🔄', color: '#f0a500', bg: 'rgba(240,165,0,0.10)', border: 'rgba(240,165,0,0.25)' }
  if (msg.includes('📅') || msg.includes('upcoming') || msg.includes('soon'))
    return { icon: '📅', color: '#9b20d8', bg: 'rgba(155,32,216,0.10)', border: 'rgba(155,32,216,0.25)' }
  if (msg.includes('🏁') || msg.includes('ended') || msg.includes('Ended'))
    return { icon: '🏁', color: '#8888aa', bg: 'rgba(136,136,170,0.10)', border: 'rgba(136,136,170,0.25)' }
  if (msg.includes('🎟') || msg.includes('ticket'))
    return { icon: '🎟️', color: '#22d3ee', bg: 'rgba(34,211,238,0.10)', border: 'rgba(34,211,238,0.25)' }
  return { icon: '🔔', color: '#9b20d8', bg: 'rgba(155,32,216,0.10)', border: 'rgba(155,32,216,0.25)' }
}

export default function NotificationsPage() {
  const [, navigate] = useLocation()
  const { token } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [announcement, setAnnouncement] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    Promise.all([
      fetch(`${BASE}/api/user/notifications`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).catch(() => ({})),
      fetch(`${BASE}/api/settings`).then(r => r.json()).catch(() => ({})),
    ]).then(([nd, sd]) => {
      setNotifications(nd.notifications || [])
      setAnnouncement(sd.settings?.announcement || '')
    }).finally(() => setLoading(false))
    // Mark all as read
    fetch(`${BASE}/api/user/notifications`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } })
  }, [token])

  return (
    <div className="app">
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '18px 18px 14px',
        borderBottom: '1.5px solid', borderImage: 'linear-gradient(90deg,#c8006a,#7b00cc) 1',
      }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#9b20d8', cursor: 'pointer', fontSize: '22px', padding: '0 4px' }}>←</button>
        <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#fff', fontSize: '18px' }}>Notifications</span>
      </div>

      <div style={{ padding: '16px 16px 100px' }}>

        {/* Announcement banner */}
        {announcement && (
          <div style={{ background: 'rgba(155,32,216,0.12)', border: '1px solid rgba(155,32,216,0.35)', borderRadius: '14px', padding: '14px 16px', marginBottom: '18px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '20px', flexShrink: 0 }}>📢</span>
            <div>
              <p style={{ color: '#c8a0ff', fontWeight: 700, fontSize: '12px', fontFamily: 'Poppins, sans-serif', marginBottom: '4px', letterSpacing: '0.5px' }}>ANNOUNCEMENT</p>
              <p style={{ color: '#ddd', fontSize: '14px', lineHeight: 1.6, fontFamily: 'Poppins, sans-serif' }}>{announcement}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ background: '#13112e', borderRadius: '14px', padding: '16px', height: '72px', opacity: 0.5 }} />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: '60px' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🔔</div>
            <p style={{ color: '#fff', fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>All caught up!</p>
            <p style={{ color: '#8888aa', fontSize: '14px', fontFamily: 'Poppins, sans-serif' }}>No notifications yet — check back after buying tickets or making a deposit.</p>
          </div>
        ) : (
          <>
            <p style={{ color: '#8888aa', fontSize: '12px', fontFamily: 'Poppins, sans-serif', marginBottom: '12px' }}>{notifications.length} notification{notifications.length !== 1 ? 's' : ''}</p>
            {notifications.map(n => {
              const { icon, color, bg, border } = typeStyle(n.message)
              return (
                <div key={n.id} style={{
                  background: n.is_read ? '#100f28' : '#13112e',
                  borderRadius: '14px',
                  border: `1px solid ${n.is_read ? 'rgba(155,32,216,0.15)' : border}`,
                  padding: '14px 16px', marginBottom: '10px',
                  display: 'flex', gap: '12px', alignItems: 'flex-start',
                }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                    {icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: n.is_read ? '#bbb' : '#fff', fontSize: '14px', lineHeight: '1.5', fontFamily: 'Poppins, sans-serif', marginBottom: '6px', wordBreak: 'break-word' }}>
                      {n.message}
                    </p>
                    <p style={{ color: '#6060a0', fontSize: '11px', fontFamily: 'Poppins, sans-serif' }}>{formatDate(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, marginTop: '6px', flexShrink: 0 }} />
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
