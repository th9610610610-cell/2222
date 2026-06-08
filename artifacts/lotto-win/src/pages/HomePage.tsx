import { useEffect, useState, useRef } from 'react'
import { useLocation } from 'wouter'
import { useAuth } from '../lib/auth'
import TopNav from '../components/TopNav'
import BottomNav from '../components/BottomNav'
import { Draw, Ad } from '../types'
import { formatCurrency, formatJackpot, getTimeLeft } from '../lib/utils'

import { API_BASE } from '../lib/apiBase'
const BASE = API_BASE

function getDrawCardBackground(draw: Draw): React.CSSProperties {
  if (draw.background_type === 'picture' && draw.background_image_url) {
    return {
      backgroundImage: `linear-gradient(145deg, rgba(10,5,30,0.82) 0%, rgba(10,10,40,0.75) 100%), url(${draw.background_image_url})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
  }
  if (draw.background_type === 'custom') {
    return {
      background: 'linear-gradient(145deg, #1a0520 0%, #2d0a10 40%, #0a1a30 100%)',
    }
  }
  return {
    background: 'linear-gradient(145deg, #2a0e50 0%, #150d40 45%, #0d1a50 100%)',
  }
}

export default function HomePage() {
  const [, navigate] = useLocation()
  const { user, token } = useAuth()
  const [draws, setDraws] = useState<Draw[]>([])
  const [loading, setLoading] = useState(true)
  const [ads, setAds] = useState<Ad[]>([])
  const [adIndex, setAdIndex] = useState(0)
  const [slideIdx, setSlideIdx] = useState(0)
  const adTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const touchStartX = useRef(0)

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    fetch(`${BASE}/api/draws`).then(r => r.json()).then(d => {
      setDraws(d.draws || [])
      setLoading(false)
    }).catch(() => setLoading(false))

    fetch(`${BASE}/api/ads`).then(r => r.json()).then(d => {
      setAds(d.ads || [])
    }).catch(() => {})
  }, [token])

  useEffect(() => {
    if (ads.length <= 1) return
    adTimer.current = setInterval(() => {
      setAdIndex(i => (i + 1) % ads.length)
    }, 4000)
    return () => { if (adTimer.current) clearInterval(adTimer.current) }
  }, [ads.length])

  const liveDraws = draws.filter(d => d.status === 'live')

  const uid = user?.id ? parseInt(String(user.id), 10) : NaN
  const accNumber = user?.id
    ? `ACC#${!isNaN(uid) ? 1000 + uid : String(user.id).replace(/\D/g, '').slice(-4).padStart(4, '0')}`
    : 'ACC#----'

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (delta < -50) setSlideIdx(i => Math.min(i + 1, Math.max(0, liveDraws.length - 1)))
    if (delta > 50) setSlideIdx(i => Math.max(i - 1, 0))
  }

  const displayDraws = liveDraws.length > 0 ? liveDraws : [null]
  const safeSlideIdx = Math.min(slideIdx, displayDraws.length - 1)

  const ad = ads.length > 0 ? ads[adIndex % ads.length] : null

  return (
    <div className="app">
      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(74,222,128,0.7); }
          50% { opacity: 0.5; box-shadow: 0 0 0 6px rgba(74,222,128,0); }
        }
        @keyframes tvScanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(200%); }
        }
        @keyframes adGlow {
          0%, 100% { box-shadow: 0 0 12px rgba(155,32,216,0.3), 0 0 0 1px rgba(155,32,216,0.2); }
          50% { box-shadow: 0 0 28px rgba(240,165,0,0.4), 0 0 0 1px rgba(240,165,0,0.3); }
        }
        @keyframes adFadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes customCardStar {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
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
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.22, pointerEvents: 'none' }} viewBox="0 0 360 140" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="mg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#9b20d8"/><stop offset="100%" stopColor="#e8187a"/></linearGradient>
              <linearGradient id="mg2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#e8187a"/><stop offset="100%" stopColor="#f0a500"/></linearGradient>
              <radialGradient id="mg3" cx="80%" cy="20%"><stop offset="0%" stopColor="#f0a500" stopOpacity="0.6"/><stop offset="100%" stopColor="transparent"/></radialGradient>
            </defs>
            <path d="M0 80 Q60 40 120 70 Q180 100 240 60 Q300 20 360 55 L360 140 L0 140Z" fill="url(#mg1)"/>
            <path d="M0 100 Q80 65 160 90 Q240 115 320 75 Q345 62 360 80 L360 140 L0 140Z" fill="url(#mg2)" opacity="0.5"/>
            <circle cx="280" cy="30" r="40" fill="url(#mg3)"/>
            <circle cx="40" cy="110" r="3" fill="#9b20d8" opacity="0.7"/>
            <circle cx="90" cy="25" r="2" fill="#f0a500" opacity="0.6"/>
            <circle cx="200" cy="15" r="2.5" fill="#e8187a" opacity="0.5"/>
            <circle cx="320" cy="100" r="2" fill="#9b20d8" opacity="0.6"/>
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
          <div onClick={() => navigate('/my-tickets')} style={{
            flex: 1, background: '#13112e',
            borderRadius: '16px', border: '1px solid rgba(34,211,238,0.2)',
            padding: '18px 16px', cursor: 'pointer',
          }}>
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

          <div onClick={() => navigate('/winner')} style={{
            flex: 1, background: '#13112e',
            borderRadius: '16px', border: '1px solid rgba(240,165,0,0.25)',
            padding: '18px 16px', cursor: 'pointer',
          }}>
            <svg width="38" height="38" viewBox="0 0 40 40" fill="none" style={{ marginBottom: '14px' }}>
              <circle cx="20" cy="16" r="8" stroke="#f0a500" strokeWidth="2.5" fill="rgba(240,165,0,0.1)"/>
              <path d="M12 32 C12 27 28 27 28 32" stroke="#f0a500" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              <path d="M16 10 L18 14 L22 14 L19 17 L20 21 L16 18.5 L12 21 L13 17 L10 14 L14 14 Z" fill="#f0a500" opacity="0.7"/>
            </svg>
            <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '13px', color: '#fff', letterSpacing: '0.5px', marginBottom: '6px' }}>WINNERS</p>
            <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '11px', color: '#f0a500', letterSpacing: '0.5px' }}>VIEW →</p>
          </div>
        </div>

        {/* ── Ads Slot — TV Style Fixed Card ── */}
        <div style={{
          borderRadius: '18px',
          overflow: 'hidden',
          marginBottom: '20px',
          height: '160px',
          position: 'relative',
          animation: 'adGlow 3s ease-in-out infinite',
        }}>
          {/* TV frame border */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, #1a0b38 0%, #0d1540 100%)',
            zIndex: 0,
          }} />

          {/* Scanline overlay */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', left: 0, right: 0, height: '60px',
              background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.025) 50%, transparent 100%)',
              animation: 'tvScanline 4s linear infinite',
              top: 0,
            }} />
          </div>

          {/* Noise texture */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.04\'/%3E%3C/svg%3E")',
            opacity: 0.3,
          }} />

          {/* Ad badge */}
          <span style={{
            position: 'absolute', top: '10px', right: '10px', zIndex: 5,
            background: 'rgba(0,0,0,0.55)', color: '#aaa', fontSize: '10px',
            fontWeight: 700, padding: '2px 8px', borderRadius: '6px', fontFamily: 'Poppins, sans-serif',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>AD</span>

          {/* Dot indicators */}
          {ads.length > 1 && (
            <div style={{ position: 'absolute', bottom: '10px', right: '12px', display: 'flex', gap: '5px', zIndex: 5 }}>
              {ads.map((_, i) => (
                <div key={i} onClick={() => setAdIndex(i)} style={{
                  width: i === adIndex % ads.length ? '18px' : '6px', height: '6px',
                  borderRadius: '3px', background: i === adIndex % ads.length ? '#f0a500' : 'rgba(255,255,255,0.25)',
                  cursor: 'pointer', transition: 'all 0.3s',
                }} />
              ))}
            </div>
          )}

          {/* Ad Content */}
          <div key={adIndex} style={{
            position: 'absolute', inset: 0, zIndex: 4,
            display: 'flex', alignItems: 'center',
            padding: '16px 18px',
            animation: 'adFadeIn 0.5s ease',
          }}>
            {ad ? (
              ad.type === 'video' ? (
                <video src={ad.content} autoPlay muted loop playsInline style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  objectFit: 'cover', zIndex: 1,
                }} />
              ) : ad.type === 'image' ? (
                <>
                  <img src={ad.content} alt={ad.title} style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                    objectFit: 'cover', zIndex: 1,
                  }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  {/* Overlay for text readability */}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(0,0,0,0.6) 0%, transparent 60%)', zIndex: 2 }} />
                  <div style={{ position: 'relative', zIndex: 3 }}>
                    {ad.title && <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: '17px', color: '#fff', marginBottom: '6px', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>{ad.title}</p>}
                    {ad.link_url && <button onClick={() => window.open(ad.link_url, '_blank')} style={{ padding: '7px 16px', borderRadius: '50px', border: '1.5px solid rgba(255,255,255,0.6)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>Learn More ›</button>}
                  </div>
                </>
              ) : (
                <div style={{ width: '100%', paddingRight: '36px' }}>
                  {/* Decorative glowing orb */}
                  <div style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', width: '60px', height: '60px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(240,165,0,0.3) 0%, transparent 70%)', filter: 'blur(8px)' }} />
                  {ad.title && <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff', marginBottom: '6px', lineHeight: '1.2' }}>{ad.title}</p>}
                  <p style={{ color: '#bbbbcc', fontSize: '13px', fontFamily: 'Poppins, sans-serif', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{ad.content}</p>
                  {ad.link_url && <button onClick={() => window.open(ad.link_url, '_blank')} style={{ marginTop: '10px', padding: '7px 16px', borderRadius: '50px', border: '1.5px solid rgba(255,255,255,0.3)', background: 'transparent', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>Learn More ›</button>}
                </div>
              )
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div>
                  <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff', marginBottom: '4px' }}>Play More, Win Big! 🚀</p>
                  <p style={{ color: '#8888aa', fontSize: '12px', marginBottom: '14px', fontFamily: 'Poppins, sans-serif' }}>Your luck is waiting for you.</p>
                  <button onClick={() => navigate('/draws')} style={{ padding: '9px 18px', borderRadius: '50px', border: '1.5px solid rgba(255,255,255,0.3)', background: 'transparent', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>Play Now ›</button>
                </div>
                <div style={{ fontSize: '56px', lineHeight: 1, flexShrink: 0, filter: 'drop-shadow(0 0 12px rgba(240,165,0,0.4))' }}>🎁</div>
              </div>
            )}
          </div>
        </div>

        {/* ── Draw Live Now header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🏆</span>
            <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: '15px', color: '#e8187a', letterSpacing: '1px' }}>DRAW LIVE NOW</span>
            <span style={{
              display: 'inline-block', width: '9px', height: '9px', borderRadius: '50%',
              background: '#4ade80',
              animation: 'livePulse 1.4s ease-in-out infinite',
            }} />
          </div>
          <span onClick={() => navigate('/draws')} style={{ color: '#aaa8cc', fontSize: '13px', cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>See all →</span>
        </div>

        {/* ── Horizontal Swipe Slider ── */}
        {loading ? (
          <div style={{ background: '#13112e', borderRadius: '18px', padding: '30px', textAlign: 'center', color: '#8888aa', marginBottom: '14px' }}>Loading draws...</div>
        ) : (
          <div>
            {/* Slider Track */}
            <div
              style={{ overflow: 'hidden', borderRadius: '18px' }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div style={{
                display: 'flex',
                transform: `translateX(calc(-${safeSlideIdx * 100}%))`,
                transition: 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              }}>
                {displayDraws.map((draw, idx) => (
                  <div key={draw?.id ?? 'placeholder'} style={{ minWidth: '100%' }}>
                    {/* Draw Card */}
                    <div style={{
                      ...getDrawCardBackground(draw || { background_type: 'natural', background_image_url: '' } as Draw),
                      borderRadius: '18px',
                      border: draw?.background_type === 'custom'
                        ? '1px solid rgba(240,80,50,0.4)'
                        : draw?.background_type === 'picture'
                          ? '1px solid rgba(255,255,255,0.15)'
                          : '1px solid rgba(155,32,216,0.3)',
                      padding: '20px', position: 'relative', overflow: 'hidden',
                      boxShadow: draw?.background_type === 'custom'
                        ? '0 8px 32px rgba(200,50,30,0.25)'
                        : '0 8px 32px rgba(155,32,216,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
                    }}>
                      {/* Radial glows */}
                      {draw?.background_type !== 'picture' && (
                        <>
                          <div style={{ position: 'absolute', top: '-30px', right: '-20px', width: '160px', height: '160px', background: draw?.background_type === 'custom' ? 'radial-gradient(circle, rgba(240,120,0,0.18) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(240,165,0,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
                          <div style={{ position: 'absolute', bottom: '-20px', left: '-20px', width: '120px', height: '120px', background: draw?.background_type === 'custom' ? 'radial-gradient(circle, rgba(200,30,30,0.2) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(155,32,216,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
                        </>
                      )}

                      {/* Stars */}
                      <span style={{ position: 'absolute', top: '12px', right: '50px', color: draw?.background_type === 'custom' ? '#ff6a30' : '#f0a500', fontSize: '10px', opacity: 0.8, animation: 'customCardStar 2s ease-in-out infinite' }}>✦</span>
                      <span style={{ position: 'absolute', bottom: '16px', right: '18px', color: draw?.background_type === 'custom' ? '#ff4040' : '#9b20d8', fontSize: '8px', opacity: 0.9 }}>✦</span>
                      <span style={{ position: 'absolute', bottom: '38px', left: '20px', color: draw?.background_type === 'custom' ? '#ff9030' : '#e8187a', fontSize: '7px', opacity: 0.6 }}>✦</span>

                      {/* Multi-draw count badge */}
                      {liveDraws.length > 1 && (
                        <div style={{
                          position: 'absolute', top: '10px', left: '10px',
                          background: 'rgba(0,0,0,0.5)', borderRadius: '8px', padding: '3px 8px',
                          fontSize: '11px', color: '#ccc', fontFamily: 'Poppins, sans-serif', fontWeight: 600,
                        }}>{idx + 1}/{liveDraws.length}</div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', marginTop: liveDraws.length > 1 ? '18px' : '0' }}>
                        <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: '16px', color: '#fff', letterSpacing: '1px' }}>
                          {draw ? draw.name.toUpperCase() : 'LUCKY DRAW'}
                        </span>
                        <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '13px', color: draw?.background_type === 'custom' ? '#ff9030' : '#e8187a' }}>
                          {draw ? getTimeLeft(draw.end_date).toUpperCase() : 'COMING SOON'}
                        </span>
                      </div>

                      {/* Orbital ring + jackpot */}
                      <div style={{ textAlign: 'center', padding: '14px 0 8px', position: 'relative' }}>
                        <svg style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', opacity: 0.15, pointerEvents: 'none' }} width="280" height="80" viewBox="0 0 280 80">
                          <ellipse cx="140" cy="40" rx="130" ry="28" stroke="url(#orb2)" strokeWidth="1.5" fill="none"/>
                          <defs>
                            <linearGradient id="orb2" x1="0" y1="0" x2="280" y2="0">
                              <stop offset="0%" stopColor={draw?.background_type === 'custom' ? '#ff6a30' : '#f0a500'}/>
                              <stop offset="100%" stopColor={draw?.background_type === 'custom' ? '#ff2020' : '#e8187a'}/>
                            </linearGradient>
                          </defs>
                        </svg>
                        <h1 style={{
                          fontFamily: 'Poppins, sans-serif', fontWeight: 900, fontSize: '42px',
                          background: draw?.background_type === 'custom'
                            ? 'linear-gradient(90deg, #ff9030, #ff9030 40%, #ff2020 70%)'
                            : 'linear-gradient(90deg, #f0a500, #f0a500 40%, #e8187a 70%)',
                          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text', margin: 0, letterSpacing: '-1px', display: 'inline-block',
                        }}>{draw ? formatJackpot(draw.jackpot) : '1MILLION ৳'}</h1>
                        <span style={{ color: draw?.background_type === 'custom' ? '#ff9030' : '#f0a500', fontSize: '13px', marginLeft: '4px' }}>✦</span>
                      </div>
                      <p style={{ textAlign: 'center', color: '#8888aa', fontSize: '13px', fontFamily: 'Poppins, sans-serif', marginTop: '4px' }}>
                        Ticket Price: {draw ? formatCurrency(draw.ticket_price) : '৳100'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Slider Dots */}
            {displayDraws.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '12px', marginBottom: '4px' }}>
                {displayDraws.map((_, i) => (
                  <div key={i} onClick={() => setSlideIdx(i)} style={{
                    width: i === safeSlideIdx ? '20px' : '7px', height: '7px',
                    borderRadius: '4px',
                    background: i === safeSlideIdx ? '#e8187a' : 'rgba(255,255,255,0.2)',
                    cursor: 'pointer', transition: 'all 0.3s ease',
                  }} />
                ))}
              </div>
            )}

            {/* Buy Button — outside slider */}
            <button onClick={() => navigate('/draws')} style={{
              width: '100%', padding: '15px 22px',
              borderRadius: '20px',
              border: 'none', cursor: 'pointer', marginTop: '12px',
              background: 'linear-gradient(90deg, #f0a500 0%, #e8187a 50%, #9b20d8 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: '0 6px 24px rgba(155,32,216,0.35)',
            }}>
              <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: '15px', color: '#fff', letterSpacing: '1.5px' }}>BUY TICKET NOW</span>
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
        )}
      </div>
      <BottomNav />
    </div>
  )
}
