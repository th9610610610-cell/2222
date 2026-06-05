import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { useAuth } from '../lib/auth'
import TopNav from '../components/TopNav'
import BottomNav from '../components/BottomNav'
import { Draw } from '../types'
import { formatCurrency, getTimeLeft } from '../lib/utils'

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

export default function HomePage() {
  const [, navigate] = useLocation()
  const { user, token } = useAuth()
  const [draws, setDraws] = useState<Draw[]>([])
  const [loading, setLoading] = useState(true)
  const [ticketCount, setTicketCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    fetch(`${BASE}/api/draws`).then(r => r.json()).then(d => {
      setDraws(d.draws || [])
      setLoading(false)
    }).catch(() => setLoading(false))

    fetch(`${BASE}/api/tickets`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => {
        const all = d.tickets || []
        setTicketCount(all.length)
        setPendingCount(all.filter((t: any) => t.status === 'pending').length)
      }).catch(() => {})
  }, [token])

  const liveDraws = draws.filter(d => d.status === 'live')

  // ACC#1001 format — id is string, use sequential number from last digits or index
  const uid = user?.id ? parseInt(String(user.id), 10) : NaN
  const accNumber = user?.id
    ? `ACC#${!isNaN(uid) ? 1000 + uid : String(user.id).replace(/\D/g, '').slice(-4).padStart(4, '0')}`
    : 'ACC#----'

  return (
    <div className="app">
      <TopNav />
      <div style={{ padding: '16px 16px 120px' }}>

        {/* ── Balance Card ── */}
        <div style={{
          background: 'linear-gradient(135deg, #1e0d42 0%, #0e1640 60%, #0a1535 100%)',
          borderRadius: '20px',
          boxShadow: '0 0 0 1.5px rgba(155,32,216,0.45)',
          padding: '20px', marginBottom: '14px',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Unique mesh background */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.22, pointerEvents: 'none' }} viewBox="0 0 360 140" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="mg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#9b20d8"/><stop offset="100%" stopColor="#e8187a"/></linearGradient>
              <linearGradient id="mg2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#e8187a"/><stop offset="100%" stopColor="#f0a500"/></linearGradient>
              <radialGradient id="mg3" cx="80%" cy="20%"><stop offset="0%" stopColor="#f0a500" stopOpacity="0.6"/><stop offset="100%" stopColor="transparent"/></radialGradient>
            </defs>
            {/* Wavy bands */}
            <path d="M0 80 Q60 40 120 70 Q180 100 240 60 Q300 20 360 55 L360 140 L0 140Z" fill="url(#mg1)"/>
            <path d="M0 100 Q80 65 160 90 Q240 115 320 75 Q345 62 360 80 L360 140 L0 140Z" fill="url(#mg2)" opacity="0.5"/>
            {/* Floating dots */}
            <circle cx="280" cy="30" r="40" fill="url(#mg3)"/>
            <circle cx="40" cy="110" r="3" fill="#9b20d8" opacity="0.7"/>
            <circle cx="90" cy="25" r="2" fill="#f0a500" opacity="0.6"/>
            <circle cx="200" cy="15" r="2.5" fill="#e8187a" opacity="0.5"/>
            <circle cx="320" cy="100" r="2" fill="#9b20d8" opacity="0.6"/>
            {/* Grid lines */}
            <line x1="0" y1="35" x2="360" y2="35" stroke="#9b20d8" strokeWidth="0.4" opacity="0.4" strokeDasharray="6 8"/>
            <line x1="0" y1="70" x2="360" y2="70" stroke="#e8187a" strokeWidth="0.4" opacity="0.3" strokeDasharray="6 8"/>
          </svg>
          <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
            <div style={{
              width: '50px', height: '50px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #f0a500 0%, #e8187a 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(240,165,0,0.4)', position: 'relative',
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="6" width="20" height="13" rx="2" stroke="#fff" strokeWidth="2"/>
                <path d="M2 10H22" stroke="#fff" strokeWidth="2"/>
                <rect x="15" y="13" width="4" height="3" rx="1" fill="#fff"/>
              </svg>
              <span style={{ position: 'absolute', top: '-7px', right: '-3px', fontSize: '15px', color: '#ffe066' }}>✦</span>
            </div>
          </div>
          <p style={{ color: '#aaa8cc', fontSize: '13px', fontWeight: 500, marginBottom: '6px', fontFamily: 'Poppins, sans-serif' }}>Total Balance</p>
          <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '38px', fontWeight: 800, color: '#fff', marginBottom: '6px', letterSpacing: '-1px' }}>
            {formatCurrency(user?.balance || 0)}
          </h2>
          <p style={{ color: '#7878a8', fontSize: '13px', marginBottom: '18px', fontFamily: 'Poppins, sans-serif', position: 'relative', zIndex: 1 }}>{accNumber}</p>
          <button onClick={() => navigate('/deposit')} style={{
            padding: '12px 28px', borderRadius: '50px', border: 'none', cursor: 'pointer',
            background: 'linear-gradient(90deg, #f0a500 0%, #e8187a 100%)',
            color: '#fff', fontWeight: 700, fontSize: '15px',
            fontFamily: 'Poppins, sans-serif',
            boxShadow: '0 4px 14px rgba(232,24,122,0.4)',
            position: 'relative', zIndex: 1,
          }}>+ Add Money</button>
        </div>

        {/* ── My Ticket + Pending row ── */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
          {/* My Ticket */}
          <div onClick={() => navigate('/my-tickets')} style={{
            flex: 1, background: '#13112e',
            borderRadius: '16px', border: '1px solid rgba(34,211,238,0.2)',
            padding: '18px 16px', cursor: 'pointer',
          }}>
            {/* Cyan ticket icon — notched sides with X pattern */}
            <svg width="48" height="30" viewBox="0 0 48 30" fill="none" style={{ marginBottom: '14px' }}>
              <path d="M4 0 H44 A4 4 0 0 1 48 4 V10 A5 5 0 0 0 48 20 V26 A4 4 0 0 1 44 30 H4 A4 4 0 0 1 0 26 V20 A5 5 0 0 0 0 10 V4 A4 4 0 0 1 4 0 Z" fill="rgba(34,211,238,0.12)" stroke="#22d3ee" strokeWidth="1.8"/>
              <line x1="16" y1="2" x2="16" y2="28" stroke="#22d3ee" strokeWidth="1.4" strokeDasharray="3 2.5"/>
              <line x1="32" y1="2" x2="32" y2="28" stroke="#22d3ee" strokeWidth="1.4" strokeDasharray="3 2.5"/>
              <line x1="20" y1="10" x2="28" y2="20" stroke="#22d3ee" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="28" y1="10" x2="20" y2="20" stroke="#22d3ee" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '13px', color: '#fff', letterSpacing: '0.5px', marginBottom: '6px' }}>MY TICKETS</p>
            <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '11px', color: '#22d3ee', letterSpacing: '0.5px' }}>VIEW ALL →</p>
          </div>

          {/* Pending */}
          <div onClick={() => navigate('/my-tickets')} style={{
            flex: 1, background: '#13112e',
            borderRadius: '16px', border: '1px solid rgba(155,32,216,0.25)',
            padding: '18px 16px', cursor: 'pointer',
          }}>
            {/* Purple circular arrows — sync/refresh style */}
            <svg width="38" height="38" viewBox="0 0 40 40" fill="none" style={{ marginBottom: '14px' }}>
              {/* Top arc arrow (left-to-right) */}
              <path d="M8 20 A12 12 0 0 1 32 20" stroke="#9b20d8" strokeWidth="3" strokeLinecap="round" fill="none"/>
              <polyline points="29,14 32,20 26,21" stroke="#9b20d8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              {/* Bottom arc arrow (right-to-left) */}
              <path d="M32 20 A12 12 0 0 1 8 20" stroke="#9b20d8" strokeWidth="3" strokeLinecap="round" fill="none"/>
              <polyline points="11,26 8,20 14,19" stroke="#9b20d8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '13px', color: '#fff', letterSpacing: '0.5px', marginBottom: '6px' }}>PENDING</p>
            <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '11px', color: '#9b20d8', letterSpacing: '0.5px' }}>HISTORY →</p>
          </div>
        </div>

        {/* ── Ads Slot ── */}
        <div style={{
          background: 'linear-gradient(135deg, #1a0b38 0%, #0d1540 100%)',
          borderRadius: '18px', border: '1px solid rgba(155,32,216,0.2)',
          padding: '18px 18px 18px 20px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'relative', overflow: 'hidden',
        }}>
          <span style={{
            position: 'absolute', top: '10px', right: '10px',
            background: 'rgba(255,255,255,0.12)', color: '#aaa', fontSize: '10px',
            fontWeight: 600, padding: '2px 7px', borderRadius: '6px', fontFamily: 'Poppins, sans-serif',
          }}>Ad</span>
          <div>
            <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: '17px', color: '#fff', marginBottom: '4px' }}>Play More, Win Big! 🚀</p>
            <p style={{ color: '#8888aa', fontSize: '12px', marginBottom: '14px', fontFamily: 'Poppins, sans-serif' }}>Your luck is waiting for you.</p>
            <button onClick={() => navigate('/draws')} style={{
              padding: '9px 18px', borderRadius: '50px', border: '1.5px solid rgba(255,255,255,0.3)',
              background: 'transparent', color: '#fff', fontWeight: 600, fontSize: '13px',
              cursor: 'pointer', fontFamily: 'Poppins, sans-serif', display: 'flex', alignItems: 'center', gap: '6px',
            }}>Play Now <span style={{ fontSize: '14px' }}>›</span></button>
          </div>
          <div style={{ fontSize: '64px', lineHeight: 1, flexShrink: 0, filter: 'drop-shadow(0 0 12px rgba(240,165,0,0.4))' }}>🎁</div>
        </div>

        {/* ── Draw Live Now header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🏆</span>
            <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: '15px', color: '#e8187a', letterSpacing: '1px' }}>DRAW LIVE NOW</span>
          </div>
          <span onClick={() => navigate('/draws')} style={{ color: '#aaa8cc', fontSize: '13px', cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>See all draws →</span>
        </div>

        {/* ── Draw Cards (NO buy button inside) ── */}
        {loading ? (
          <div style={{ background: '#13112e', borderRadius: '18px', padding: '30px', textAlign: 'center', color: '#8888aa', marginBottom: '14px' }}>Loading draws...</div>
        ) : (liveDraws.length > 0 ? liveDraws : [null]).map((draw, idx) => (
          <div key={draw?.id ?? 'placeholder'} style={{ marginBottom: '12px' }}>
            {/* Draw info card */}
            <div style={{
              background: 'linear-gradient(145deg, #2a0e50 0%, #150d40 45%, #0d1a50 100%)',
              borderRadius: '18px', border: '1px solid rgba(155,32,216,0.3)',
              padding: '20px', position: 'relative', overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(155,32,216,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}>
              {/* Radial glow top-right */}
              <div style={{ position: 'absolute', top: '-30px', right: '-20px', width: '160px', height: '160px', background: 'radial-gradient(circle, rgba(240,165,0,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
              {/* Radial glow bottom-left */}
              <div style={{ position: 'absolute', bottom: '-20px', left: '-20px', width: '120px', height: '120px', background: 'radial-gradient(circle, rgba(155,32,216,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
              {/* Star decorations */}
              <span style={{ position: 'absolute', top: '12px', right: '50px', color: '#f0a500', fontSize: '10px', opacity: 0.7 }}>✦</span>
              <span style={{ position: 'absolute', bottom: '16px', right: '18px', color: '#9b20d8', fontSize: '8px', opacity: 0.8 }}>✦</span>
              <span style={{ position: 'absolute', bottom: '38px', left: '20px', color: '#e8187a', fontSize: '7px', opacity: 0.5 }}>✦</span>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: '16px', color: '#fff', letterSpacing: '1px' }}>
                  {draw ? draw.name.toUpperCase() : 'LUCKY DRAW'}
                </span>
                <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '13px', color: '#e8187a' }}>
                  {draw ? getTimeLeft(draw.end_date).toUpperCase() : 'COMING SOON'}
                </span>
              </div>

              {/* Orbital ring + jackpot */}
              <div style={{ textAlign: 'center', padding: '14px 0 8px', position: 'relative' }}>
                <svg style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', opacity: 0.15, pointerEvents: 'none' }} width="280" height="80" viewBox="0 0 280 80">
                  <ellipse cx="140" cy="40" rx="130" ry="28" stroke="url(#orb)" strokeWidth="1.5" fill="none"/>
                  <defs>
                    <linearGradient id="orb" x1="0" y1="0" x2="280" y2="0">
                      <stop offset="0%" stopColor="#f0a500"/><stop offset="100%" stopColor="#e8187a"/>
                    </linearGradient>
                  </defs>
                </svg>
                <h1 style={{
                  fontFamily: 'Poppins, sans-serif', fontWeight: 900, fontSize: '42px',
                  background: 'linear-gradient(90deg, #f0a500, #f0a500 40%, #e8187a 70%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text', margin: 0, letterSpacing: '-1px', display: 'inline-block',
                }}>{draw ? formatCurrency(draw.jackpot) : '৳1 MILLION'}</h1>
                <span style={{ color: '#f0a500', fontSize: '13px', marginLeft: '4px' }}>✦</span>
              </div>
              <p style={{ textAlign: 'center', color: '#8888aa', fontSize: '13px', fontFamily: 'Poppins, sans-serif', marginTop: '4px' }}>
                Ticket Price: {draw ? formatCurrency(draw.ticket_price) : '৳100'}
              </p>
            </div>

            {/* Buy button — SEPARATE from card */}
            <button onClick={() => navigate('/draws')} style={{
              width: '100%', padding: '15px 22px',
              borderRadius: '20px',
              border: 'none', cursor: 'pointer', marginTop: '10px',
              background: 'linear-gradient(90deg, #f0a500 0%, #e8187a 50%, #9b20d8 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: '0 6px 24px rgba(155,32,216,0.35)',
            }}>
              <span style={{
                fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: '15px',
                color: '#fff', letterSpacing: '1.5px',
              }}>BUY TICKET NOW</span>
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12H19M13 6L19 12L13 18" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </button>
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  )
}
