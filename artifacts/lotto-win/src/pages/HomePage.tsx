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
  const accNumber = user?.id ? `ACC #${String(user.id).padStart(5, '0')}` : 'ACC #00001'

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
          {/* Wave SVG decoration */}
          <svg style={{ position: 'absolute', bottom: 0, left: 0, opacity: 0.2, pointerEvents: 'none' }} width="280" height="90" viewBox="0 0 280 90">
            <path d="M0 65 Q50 25 100 55 Q150 85 200 45 Q240 10 280 40 L280 90 L0 90Z" fill="url(#wg1)"/>
            <path d="M0 75 Q60 45 120 65 Q180 85 230 55 Q255 35 280 60 L280 90 L0 90Z" fill="url(#wg2)" opacity="0.55"/>
            <defs>
              <linearGradient id="wg1" x1="0" y1="0" x2="280" y2="0">
                <stop offset="0%" stopColor="#9b20d8"/>
                <stop offset="100%" stopColor="#e8187a"/>
              </linearGradient>
              <linearGradient id="wg2" x1="0" y1="0" x2="280" y2="0">
                <stop offset="0%" stopColor="#e8187a"/>
                <stop offset="100%" stopColor="#f0a500"/>
              </linearGradient>
            </defs>
          </svg>
          {/* Wallet icon */}
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
            borderRadius: '16px', border: '1px solid rgba(155,32,216,0.2)',
            padding: '16px', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', gap: '6px',
          }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px',
              background: 'rgba(155,32,216,0.2)', border: '1.5px solid rgba(155,32,216,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="7" width="20" height="10" rx="2" stroke="#9b20d8" strokeWidth="2"/>
                <path d="M15 7V17" stroke="#9b20d8" strokeWidth="1.5" strokeDasharray="2 2"/>
                <path d="M9 7V17" stroke="#9b20d8" strokeWidth="1.5" strokeDasharray="2 2"/>
              </svg>
            </div>
            <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: '22px', color: '#fff', marginTop: '4px' }}>{ticketCount}</p>
            <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '11px', color: '#9b20d8', letterSpacing: '0.5px' }}>MY TICKET →</p>
          </div>

          {/* Pending */}
          <div onClick={() => navigate('/my-tickets')} style={{
            flex: 1, background: '#13112e',
            borderRadius: '16px', border: '1px solid rgba(155,32,216,0.2)',
            padding: '16px', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', gap: '6px',
          }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px',
              background: 'rgba(34,211,238,0.12)', border: '1.5px solid rgba(34,211,238,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="#22d3ee" strokeWidth="2"/>
                <path d="M12 7V12L15 15" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: '22px', color: '#fff', marginTop: '4px' }}>{pendingCount}</p>
            <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '11px', color: '#22d3ee', letterSpacing: '0.5px' }}>PENDING →</p>
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
          {/* Gift box illustration */}
          <div style={{ fontSize: '62px', lineHeight: 1, flexShrink: 0, marginRight: '4px', filter: 'drop-shadow(0 0 12px rgba(240,165,0,0.4))' }}>🎁</div>
        </div>

        {/* ── Draw Live Now section ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🏆</span>
            <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: '15px', color: '#e8187a', letterSpacing: '1px' }}>DRAW LIVE NOW</span>
          </div>
          <span onClick={() => navigate('/draws')} style={{ color: '#aaa8cc', fontSize: '13px', cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>See all draws →</span>
        </div>

        {loading ? (
          <div style={{ background: '#13112e', borderRadius: '18px', padding: '30px', textAlign: 'center', color: '#8888aa', marginBottom: '14px' }}>Loading draws...</div>
        ) : liveDraws.length === 0 ? (
          <div style={{ background: '#13112e', borderRadius: '18px', padding: '30px', textAlign: 'center', color: '#8888aa', marginBottom: '14px' }}>No live draws right now</div>
        ) : liveDraws.map(draw => (
          <div key={draw.id} style={{
            background: 'linear-gradient(160deg, #1a0b3e 0%, #0d1540 100%)',
            borderRadius: '18px', border: '1px solid rgba(155,32,216,0.25)',
            padding: '20px', marginBottom: '14px',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Subtle sparkles */}
            <span style={{ position: 'absolute', top: '12px', right: '60px', color: '#f0a500', fontSize: '10px', opacity: 0.6 }}>✦</span>
            <span style={{ position: 'absolute', bottom: '50px', right: '20px', color: '#9b20d8', fontSize: '8px', opacity: 0.7 }}>✦</span>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: '16px', color: '#fff', letterSpacing: '1px' }}>{draw.name.toUpperCase()}</span>
              <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '13px', color: '#e8187a' }}>{getTimeLeft(draw.end_date).toUpperCase()}</span>
            </div>

            {/* Big jackpot amount */}
            <div style={{ textAlign: 'center', padding: '14px 0 8px', position: 'relative' }}>
              {/* Orbital ring decoration */}
              <svg style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', opacity: 0.18, pointerEvents: 'none' }} width="280" height="80" viewBox="0 0 280 80">
                <ellipse cx="140" cy="40" rx="130" ry="28" stroke="url(#orb)" strokeWidth="1.5" fill="none"/>
                <defs>
                  <linearGradient id="orb" x1="0" y1="0" x2="280" y2="0">
                    <stop offset="0%" stopColor="#f0a500"/>
                    <stop offset="100%" stopColor="#e8187a"/>
                  </linearGradient>
                </defs>
              </svg>
              <h1 style={{
                fontFamily: 'Poppins, sans-serif', fontWeight: 900, fontSize: '42px',
                background: 'linear-gradient(90deg, #f0a500, #f0a500 40%, #e8187a 70%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text', margin: 0, letterSpacing: '-1px',
                display: 'inline-block',
              }}>{formatCurrency(draw.jackpot)}</h1>
              <span style={{ color: '#f0a500', fontSize: '13px', marginLeft: '4px' }}>✦</span>
            </div>

            <p style={{ textAlign: 'center', color: '#8888aa', fontSize: '13px', fontFamily: 'Poppins, sans-serif', marginBottom: '18px' }}>
              Ticket Price: {formatCurrency(draw.ticket_price)}
            </p>

            {/* Buy Ticket Now button */}
            <button onClick={() => navigate('/draws')} style={{
              width: '100%', padding: '15px 22px', borderRadius: '50px', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(90deg, #f0a500 0%, #e8187a 50%, #9b20d8 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: '0 6px 24px rgba(155,32,216,0.4)',
            }}>
              <span style={{
                fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: '15px',
                color: '#fff', letterSpacing: '1.5px',
              }}>BUY TICKET NOW</span>
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12H19M13 6L19 12L13 18" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </button>
          </div>
        ))}

        {/* No live draws — show a teaser draw card */}
        {!loading && liveDraws.length === 0 && (
          <div style={{
            background: 'linear-gradient(160deg, #1a0b3e 0%, #0d1540 100%)',
            borderRadius: '18px', border: '1px solid rgba(155,32,216,0.25)',
            padding: '20px', marginBottom: '14px', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: '16px', color: '#fff', letterSpacing: '1px' }}>LUCKY DRAW</span>
              <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '13px', color: '#e8187a' }}>COMING SOON</span>
            </div>
            <div style={{ textAlign: 'center', padding: '14px 0 8px' }}>
              <h1 style={{
                fontFamily: 'Poppins, sans-serif', fontWeight: 900, fontSize: '42px',
                background: 'linear-gradient(90deg, #f0a500, #e8187a)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text', margin: 0,
              }}>৳1 MILLION</h1>
            </div>
            <p style={{ textAlign: 'center', color: '#8888aa', fontSize: '13px', fontFamily: 'Poppins, sans-serif', marginBottom: '18px' }}>Ticket Price: ৳100</p>
            <button onClick={() => navigate('/draws')} style={{
              width: '100%', padding: '15px 22px', borderRadius: '50px', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(90deg, #f0a500 0%, #e8187a 50%, #9b20d8 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: '0 6px 24px rgba(155,32,216,0.4)',
            }}>
              <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: '15px', color: '#fff', letterSpacing: '1.5px' }}>BUY TICKET NOW</span>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12H19M13 6L19 12L13 18" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </button>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
