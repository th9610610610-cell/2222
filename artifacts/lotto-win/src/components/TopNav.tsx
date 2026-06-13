import { useLocation } from 'wouter'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../lib/auth'
import { Notification } from '../types'
import { formatDate } from '../lib/utils'

import { API_BASE } from '../lib/apiBase'
const BASE = API_BASE

export default function TopNav() {
  const [, navigate] = useLocation()
  const { user, token } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    if (!token) return
    try {
      const r = await fetch(`${BASE}/api/user/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const d = await r.json()
      if (d.notifications) setNotifications(d.notifications)
    } catch { /* ignore */ }
  }, [token])

  // Initial load + poll every 30 s
  useEffect(() => {
    fetchNotifications()
    const id = setInterval(fetchNotifications, 30_000)
    return () => clearInterval(id)
  }, [fetchNotifications])

  // Close panel on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const unread = notifications.filter(n => !n.is_read).length

  const markAllRead = async () => {
    if (!token) return
    await fetch(`${BASE}/api/user/notifications`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {})
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const handleBellClick = () => {
    const next = !open
    setOpen(next)
    if (next && unread > 0) markAllRead()
  }

  const typeStyle = (msg: string): { icon: string; color: string; bg: string } => {
    if (msg.includes('🎉') || msg.includes('won') || msg.includes('winner')) return { icon: '🎉', color: '#f0a500', bg: 'rgba(240,165,0,0.12)' }
    if (msg.includes('✅') || msg.includes('approved')) return { icon: '✅', color: '#4ade80', bg: 'rgba(74,222,128,0.10)' }
    if (msg.includes('❌') || msg.includes('rejected')) return { icon: '❌', color: '#e8187a', bg: 'rgba(232,24,122,0.10)' }
    if (msg.includes('🔴') || msg.includes('LIVE')) return { icon: '🔴', color: '#e8187a', bg: 'rgba(232,24,122,0.10)' }
    if (msg.includes('🏁') || msg.includes('ended')) return { icon: '🏁', color: '#8888aa', bg: 'rgba(136,136,170,0.10)' }
    return { icon: '🔔', color: '#9b20d8', bg: 'rgba(155,32,216,0.10)' }
  }

  const initial = user?.full_name?.charAt(0).toUpperCase() || 'U'

  return (
    <div style={{ position: 'relative' }}>
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

          {/* Bell icon */}
          <div style={{ position: 'relative', cursor: 'pointer' }} onClick={handleBellClick}>
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

          {/* Avatar */}
          <div onClick={() => navigate('/profile')} style={{
            width: '40px', height: '40px',
            background: 'linear-gradient(135deg, #f0a500 0%, #e85e00 100%)',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Poppins, sans-serif', fontSize: '18px', fontWeight: 800, color: '#fff',
            cursor: 'pointer',
          }}>{initial}</div>
        </div>
      </div>

      {/* Notification dropdown panel */}
      {open && (
        <div ref={panelRef} style={{
          position: 'absolute', top: '68px', right: '16px', zIndex: 1000,
          width: 'min(340px, calc(100vw - 32px))',
          background: '#13112e', borderRadius: '16px',
          border: '1px solid rgba(155,32,216,0.35)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 10px', borderBottom: '1px solid rgba(155,32,216,0.15)' }}>
            <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#fff', fontSize: '14px' }}>🔔 Notifications</span>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span onClick={() => { setOpen(false); navigate('/notifications') }}
                style={{ color: '#9b20d8', fontSize: '12px', cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
                View all
              </span>
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <p style={{ color: '#8888aa', textAlign: 'center', padding: '24px', fontSize: '13px', fontFamily: 'Poppins, sans-serif' }}>
                No notifications yet
              </p>
            ) : notifications.slice(0, 8).map(n => {
              const { icon, color, bg } = typeStyle(n.message)
              return (
                <div key={n.id} style={{
                  display: 'flex', gap: '10px', padding: '12px 16px',
                  borderBottom: '1px solid rgba(155,32,216,0.08)',
                  background: n.is_read ? 'transparent' : 'rgba(155,32,216,0.06)',
                }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', flexShrink: 0 }}>
                    {icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: n.is_read ? '#aaa' : '#fff', fontSize: '13px', lineHeight: '1.4', fontFamily: 'Poppins, sans-serif', marginBottom: '3px', wordBreak: 'break-word' }}>{n.message}</p>
                    <p style={{ color: '#6060a0', fontSize: '11px', fontFamily: 'Poppins, sans-serif' }}>{formatDate(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, marginTop: '4px', flexShrink: 0 }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
