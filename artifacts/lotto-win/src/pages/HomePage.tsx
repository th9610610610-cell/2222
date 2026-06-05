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

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    fetch(`${BASE}/api/draws`).then(r => r.json()).then(d => {
      setDraws(d.draws || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [token])

  const liveDraws = draws.filter(d => d.status === 'live')
  const upcomingDraws = draws.filter(d => d.status === 'upcoming')
  const recentWinners = draws.filter(d => d.status === 'ended' && d.winner_name).slice(0, 3)

  const cardStyle: React.CSSProperties = {
    background: '#100f28', borderRadius: '16px', border: '1px solid rgba(155,32,216,0.2)',
    padding: '18px', marginBottom: '12px',
  }

  const accNumber = user?.id ? `ACC #${String(user.id).padStart(5, '0')}` : 'ACC #00001'

  return (
    <div className="app">
      <TopNav />
      <div style={{ padding: '18px 18px 120px' }}>

        {/* Balance Card */}
        <div style={{
          background: 'linear-gradient(135deg, #1a0b3e 0%, #0d1535 60%, #0a1a3e 100%)',
          borderRadius: '20px',
          border: '1.5px solid transparent',
          backgroundClip: 'padding-box',
          boxShadow: '0 0 0 1.5px rgba(155,32,216,0.5), inset 0 0 0 1px rgba(240,60,180,0.15)',
          padding: '20px', marginBottom: '22px',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Wave decoration */}
          <svg style={{ position: 'absolute', bottom: 0, left: 0, opacity: 0.18 }} width="260" height="80" viewBox="0 0 260 80">
            <path d="M0 60 Q40 20 80 50 Q120 80 160 40 Q200 0 260 35 L260 80 L0 80Z" fill="url(#wg1)"/>
            <path d="M0 70 Q50 40 100 60 Q150 80 200 50 Q230 30 260 55 L260 80 L0 80Z" fill="url(#wg2)" opacity="0.6"/>
            <defs>
              <linearGradient id="wg1" x1="0" y1="0" x2="260" y2="0">
                <stop offset="0%" stopColor="#9b20d8"/>
                <stop offset="100%" stopColor="#e8187a"/>
              </linearGradient>
              <linearGradient id="wg2" x1="0" y1="0" x2="260" y2="0">
                <stop offset="0%" stopColor="#e8187a"/>
                <stop offset="100%" stopColor="#f0a500"/>
              </linearGradient>
            </defs>
          </svg>

          {/* Wallet icon top-right */}
          <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #f0a500 0%, #e8187a 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(240,165,0,0.4)',
              position: 'relative',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="6" width="20" height="13" rx="2" stroke="#fff" strokeWidth="2"/>
                <path d="M2 10H22" stroke="#fff" strokeWidth="2"/>
                <rect x="15" y="13" width="4" height="3" rx="1" fill="#fff"/>
              </svg>
              {/* sparkle */}
              <span style={{
                position: 'absolute', top: '-6px', right: '-4px',
                fontSize: '14px', color: '#ffe066',
              }}>✦</span>
            </div>
          </div>

          {/* Balance info */}
          <p style={{ color: '#aaa8cc', fontSize: '13px', fontWeight: 500, marginBottom: '6px', fontFamily: 'Poppins, sans-serif' }}>Total Balance</p>
          <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '36px', fontWeight: 800, color: '#ffffff', marginBottom: '20px', letterSpacing: '-1px' }}>
            {formatCurrency(user?.balance || 0)}
          </h2>

          {/* Bottom row: acc number + add money */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
            <span style={{ color: '#8888aa', fontSize: '13px', fontFamily: 'Poppins, sans-serif', fontWeight: 500 }}>{accNumber}</span>
            <button onClick={() => navigate('/deposit')} style={{
              padding: '10px 22px', borderRadius: '50px', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(90deg, #f0a500 0%, #e8187a 100%)',
              color: '#fff', fontWeight: 700, fontSize: '14px',
              fontFamily: 'Poppins, sans-serif',
              boxShadow: '0 4px 14px rgba(240,60,120,0.4)',
            }}>+ Add Money</button>
          </div>
        </div>

        {/* Live draws */}
        {liveDraws.length > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#fff', fontSize: '16px' }}>🔴 Live Draws</h3>
              <span onClick={() => navigate('/draws')} style={{ color: '#f0a500', fontSize: '13px', cursor: 'pointer' }}>See all</span>
            </div>
            {loading ? (
              <div style={{ ...cardStyle, textAlign: 'center', color: '#8888aa' }}>Loading...</div>
            ) : liveDraws.map(draw => (
              <div key={draw.id} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h4 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#fff', fontSize: '15px', marginBottom: '4px' }}>{draw.name}</h4>
                    <span style={{ background: 'rgba(232,24,122,0.2)', color: '#e8187a', borderRadius: '20px', padding: '2px 10px', fontSize: '12px', fontWeight: 600 }}>LIVE</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: '#f0a500', fontFamily: 'Poppins, sans-serif', fontSize: '20px', fontWeight: 800 }}>{formatCurrency(draw.jackpot)}</p>
                    <p style={{ color: '#8888aa', fontSize: '12px' }}>Jackpot</p>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <span style={{ color: '#8888aa', fontSize: '13px' }}>⏳ {getTimeLeft(draw.end_date)}</span>
                  <span style={{ color: '#8888aa', fontSize: '13px' }}>{draw.tickets_sold}/{draw.max_tickets} tickets</span>
                </div>

                {/* Buy Ticket Now button */}
                <button onClick={() => navigate('/draws')} style={{
                  width: '100%', padding: '14px 20px', borderRadius: '50px', border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(90deg, #f0a500 0%, #e8187a 50%, #9b20d8 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  boxShadow: '0 6px 20px rgba(155,32,216,0.35)',
                }}>
                  <span style={{
                    fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: '15px',
                    color: '#fff', fontStyle: 'italic', letterSpacing: '0.5px',
                  }}>BUY TICKET NOW</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '18px', lineHeight: 1 }}>—</span>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.7)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12H19M13 6L19 12L13 18" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </button>
              </div>
            ))}
          </>
        )}

        {/* Sparkle / promo */}
        <div style={{
          background: 'linear-gradient(135deg, #1a0a2e 0%, #0a1a2e 100%)',
          borderRadius: '16px', border: '1px solid rgba(240,165,0,0.2)',
          padding: '20px', marginBottom: '20px', textAlign: 'center', position: 'relative', overflow: 'hidden',
        }}>
          <span className="sp-twinkle" style={{ position: 'absolute', top: '10px', left: '14px', fontSize: '16px' }}>✦</span>
          <span className="sp-twinkle-2" style={{ position: 'absolute', top: '8px', right: '20px', fontSize: '12px', color: '#e8187a' }}>✦</span>
          <span className="sp-twinkle-3" style={{ position: 'absolute', bottom: '12px', left: '30%', fontSize: '10px', color: '#9b20d8' }}>✦</span>
          <div className="gift-float" style={{ fontSize: '36px', marginBottom: '8px' }}>🎁</div>
          <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#f0a500', fontSize: '15px' }}>Win Big Every Week!</p>
          <p style={{ color: '#8888aa', fontSize: '13px', marginTop: '4px' }}>Tickets from ৳50 · Draw every Friday</p>
        </div>

        {/* Upcoming */}
        {upcomingDraws.length > 0 && (
          <>
            <h3 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#fff', fontSize: '16px', marginBottom: '12px' }}>🔜 Upcoming Draws</h3>
            {upcomingDraws.slice(0, 2).map(draw => (
              <div key={draw.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ color: '#fff', fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{draw.name}</h4>
                  <span style={{ background: 'rgba(155,32,216,0.2)', color: '#9b20d8', borderRadius: '20px', padding: '2px 10px', fontSize: '12px', fontWeight: 600 }}>UPCOMING</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: '#f0a500', fontWeight: 800, fontSize: '16px' }}>{formatCurrency(draw.jackpot)}</p>
                  <p style={{ color: '#8888aa', fontSize: '12px' }}>{getTimeLeft(draw.end_date)}</p>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Recent winners */}
        {recentWinners.length > 0 && (
          <>
            <h3 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#fff', fontSize: '16px', margin: '20px 0 12px' }}>🏆 Recent Winners</h3>
            {recentWinners.map(draw => (
              <div key={draw.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, #f0a500, #e8187a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '16px' }}>
                    {draw.winner_name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>{draw.winner_name}</p>
                    <p style={{ color: '#8888aa', fontSize: '12px' }}>{draw.name}</p>
                  </div>
                </div>
                <p style={{ color: '#f0a500', fontWeight: 800, fontSize: '15px' }}>{formatCurrency(draw.jackpot)}</p>
              </div>
            ))}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
