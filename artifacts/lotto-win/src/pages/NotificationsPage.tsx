import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { useAuth } from '../lib/auth'
import BottomNav from '../components/BottomNav'
import { Notification } from '../types'
import { formatDate } from '../lib/utils'

import { API_BASE } from '../lib/apiBase'
const BASE = API_BASE

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
    }).catch(() => {}).finally(() => setLoading(false))
    // Mark all as read
    fetch(`${BASE}/api/user/notifications`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } })
  }, [token])

  const typeIcon = (msg: string) => {
    if (msg.includes('✅') || msg.includes('approved')) return { icon: '✅', color: '#4ade80', bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.25)' }
    if (msg.includes('❌') || msg.includes('rejected')) return { icon: '❌', color: '#e8187a', bg: 'rgba(232,24,122,0.12)', border: 'rgba(232,24,122,0.25)' }
    if (msg.includes('🎉') || msg.includes('won') || msg.includes('winner')) return { icon: '🎉', color: '#f0a500', bg: 'rgba(240,165,0,0.12)', border: 'rgba(240,165,0,0.25)' }
    if (msg.includes('🔴') || msg.includes('LIVE') || msg.includes('live')) return { icon: '🔴', color: '#e8187a', bg: 'rgba(232,24,122,0.12)', border: 'rgba(232,24,122,0.25)' }
    if (msg.includes('🔄') || msg.includes('rescheduled') || msg.includes('Rescheduled')) return { icon: '🔄', color: '#f0a500', bg: 'rgba(240,165,0,0.12)', border: 'rgba(240,165,0,0.25)' }
    if (msg.includes('📅') || msg.includes('upcoming') || msg.includes('soon')) return { icon: '📅', color: '#9b20d8', bg: 'rgba(155,32,216,0.12)', border: 'rgba(155,32,216,0.25)' }
    if (msg.includes('🏁') || msg.includes('ended') || msg.includes('Ended')) return { icon: '🏁', color: '#8888aa', bg: 'rgba(136,136,170,0.12)', border: 'rgba(136,136,170,0.25)' }
    if (msg.includes('🎟') || msg.includes('ticket')) return { icon: '🎟️', color: '#22d3ee', bg: 'rgba(34,211,238,0.12)', border: 'rgba(34,211,238,0.25)' }
    return { icon: '🔔', color: '#9b20d8', bg: 'rgba(155,32,216,0.12)', border: 'rgba(155,32,216,0.25)' }
  }

  return (
    <div className="app">
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '18px 18px 14px',
        borderBottom: '1.5px solid',
        borderImage: 'linear-gradient(90deg, #c8006a 0%, #7b00cc 100%) 1',
      }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#fff' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19L5 12L12 5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '18px', color: '#fff' }}>Notifications</span>
        <span style={{ marginLeft: 'auto', background: 'rgba(155,32,216,0.2)', color: '#9b20d8', borderRadius: '20px', padding: '3px 12px', fontSize: '12px', fontWeight: 700, fontFamily: 'Poppins, sans-serif' }}>{notifications.length}</span>
      </div>

      <div style={{ padding: '16px 16px 120px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8888aa', fontFamily: 'Poppins, sans-serif' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔔</div>
            <p>Loading notifications...</p>
          </div>
        ) : (
          <>
            {/* Pinned Announcement */}
            {announcement && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(240,165,0,0.15) 0%, rgba(155,32,216,0.12) 100%)',
                borderRadius: '16px', border: '1.5px solid rgba(240,165,0,0.45)',
                padding: '16px', marginBottom: '14px',
                display: 'flex', gap: '14px', alignItems: 'flex-start',
                position: 'relative',
              }}>
                {/* Pin icon */}
                <div style={{ position: 'absolute', top: '10px', right: '12px', background: 'rgba(240,165,0,0.2)', borderRadius: '6px', padding: '2px 8px', fontSize: '10px', color: '#f0a500', fontWeight: 700, fontFamily: 'Poppins, sans-serif' }}>📌 PINNED</div>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(240,165,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                  📢
                </div>
                <div style={{ flex: 1, minWidth: 0, paddingRight: '60px' }}>
                  <p style={{ color: '#f0a500', fontSize: '12px', fontWeight: 700, fontFamily: 'Poppins, sans-serif', marginBottom: '4px', letterSpacing: '0.5px' }}>ANNOUNCEMENT</p>
                  <p style={{ color: '#e0e0ff', fontSize: '14px', lineHeight: '1.5', fontFamily: 'Poppins, sans-serif', wordBreak: 'break-word' }}>{announcement}</p>
                </div>
              </div>
            )}

            {notifications.length === 0 && !announcement ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '14px', opacity: 0.5 }}>🔕</div>
                <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#fff', fontSize: '16px', marginBottom: '6px' }}>No notifications yet</p>
                <p style={{ color: '#7878a8', fontSize: '13px', fontFamily: 'Poppins, sans-serif' }}>You'll see updates about deposits, tickets, and wins here</p>
              </div>
            ) : (
              <>
                {notifications.length > 0 && (
                  <p style={{ color: '#7878a8', fontSize: '12px', fontFamily: 'Poppins, sans-serif', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '12px' }}>ALL NOTIFICATIONS</p>
                )}
                {notifications.map((n) => {
                  const t = typeIcon(n.message)
                  return (
                    <div key={n.id} style={{
                      background: t.bg,
                      borderRadius: '16px', border: `1px solid ${t.border}`,
                      padding: '16px', marginBottom: '10px',
                      display: 'flex', gap: '14px', alignItems: 'flex-start',
                      position: 'relative', overflow: 'hidden',
                    }}>
                      {!n.is_read && (
                        <div style={{ position: 'absolute', top: '12px', right: '14px', width: '8px', height: '8px', borderRadius: '50%', background: t.color, boxShadow: `0 0 6px ${t.color}` }} />
                      )}
                      <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                        {t.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: '#e0e0ff', fontSize: '14px', lineHeight: '1.5', fontFamily: 'Poppins, sans-serif', marginBottom: '6px', wordBreak: 'break-word' }}>{n.message}</p>
                        <p style={{ color: '#6060a0', fontSize: '11px', fontFamily: 'Poppins, sans-serif' }}>{formatDate(n.created_at)}</p>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
