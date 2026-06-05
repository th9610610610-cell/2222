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

  return (
    <div className="app">
      <TopNav />
      <div style={{ padding: '18px 18px 100px' }}>
        {/* Balance card */}
        <div style={{
          background: 'linear-gradient(135deg, #1a0b3e 0%, #0d1a3e 100%)',
          borderRadius: '20px', border: '1px solid rgba(155,32,216,0.3)',
          padding: '22px', marginBottom: '22px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(155,32,216,0.3) 0%, transparent 70%)', borderRadius: '50%' }} />
          <p style={{ color: '#8888aa', fontSize: '13px', marginBottom: '6px' }}>My Balance</p>
          <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '32px', fontWeight: 800, color: '#f0a500', marginBottom: '16px' }}>
            {formatCurrency(user?.balance || 0)}
          </h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => navigate('/deposit')} style={{
              flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(90deg, #e8187a, #9b20d8)', color: '#fff',
              fontWeight: 700, fontSize: '14px',
            }}>+ Add Money</button>
            <button onClick={() => navigate('/my-tickets')} style={{
              flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid rgba(155,32,216,0.4)', cursor: 'pointer',
              background: 'transparent', color: '#fff', fontWeight: 700, fontSize: '14px',
            }}>My Tickets</button>
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
                <button onClick={() => navigate('/draws')} style={{
                  width: '100%', padding: '11px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(90deg, #f0a500, #e8187a)', color: '#fff',
                  fontWeight: 700, fontSize: '14px',
                }}>Buy Ticket · {formatCurrency(draw.ticket_price)}</button>
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
