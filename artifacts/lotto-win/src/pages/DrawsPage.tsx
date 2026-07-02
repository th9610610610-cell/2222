import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'wouter'
import { useAuth } from '../lib/auth'

import TopNav from '../components/TopNav'
import BottomNav from '../components/BottomNav'
import { Draw } from '../types'
import { formatCurrency, formatJackpot, getTimeLeft } from '../lib/utils'

import { API_BASE } from '../lib/apiBase'
const BASE = API_BASE

type CouponStatus = 'idle' | 'checking' | 'valid' | 'invalid'

interface CouponState {
  status: CouponStatus
  discount_pct: number
  type: 'business' | 'user_partner' | null
  error: string | null
  message: string | null
}

interface DrawCampaign {
  id: string
  draw_id: string
  campaign_type: string
  title: string
  is_active: boolean
}

const emptyCoupon = (): CouponState => ({ status: 'idle', discount_pct: 0, type: null, error: null, message: null })

export default function DrawsPage() {
  const [, navigate] = useLocation()
  const { user, token, refresh } = useAuth()
  const [draws, setDraws] = useState<Draw[]>([])
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<string | null>(null)
  const [qty, setQty] = useState<Record<string, number>>({})
  const [couponCode, setCouponCode] = useState<Record<string, string>>({})
  const [couponState, setCouponState] = useState<Record<string, CouponState>>({})
  const [drawResult, setDrawResult] = useState<Record<string, { ok: boolean; text: string } | null>>({})
  const [campaigns, setCampaigns] = useState<DrawCampaign[]>([])
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const hasActiveBonus = (user?.referral_bonus_pct ?? 0) > 0 &&
    user?.referral_bonus_expires != null &&
    new Date(user.referral_bonus_expires) > new Date()

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    load()
  }, [token])

  const load = async () => {
    try {
      const d = await fetch(`${BASE}/api/draws`).then(r => r.json())
      const fetchedDraws: Draw[] = d.draws || []
      setDraws(fetchedDraws)
      setLoading(false)

      const liveDraws = fetchedDraws.filter(draw => draw.status === 'live' || draw.status === 'upcoming')
      if (liveDraws.length > 0 && token) {
        const results = await Promise.all(
          liveDraws.map(draw =>
            fetch(`${BASE}/api/campaigns?draw_id=${draw.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            }).then(r => r.json()).catch(() => ({ campaigns: [] }))
          )
        )
        const all = results.flatMap((r: any) => r.campaigns || [])
        setCampaigns(all.filter((c: DrawCampaign) => c.is_active))
      }
    } catch {
      setLoading(false)
    }
  }

  const handleCouponChange = (drawId: string, value: string) => {
    const code = value.toUpperCase()
    setCouponCode(p => ({ ...p, [drawId]: code }))

    if (!code.trim()) {
      setCouponState(p => ({ ...p, [drawId]: emptyCoupon() }))
      clearTimeout(debounceTimers.current[drawId])
      return
    }

    setCouponState(p => ({ ...p, [drawId]: { status: 'checking', discount_pct: 0, type: null, error: null, message: null } }))
    clearTimeout(debounceTimers.current[drawId])
    debounceTimers.current[drawId] = setTimeout(() => validateCoupon(drawId, code), 600)
  }

  const validateCoupon = async (drawId: string, code: string) => {
    try {
      const res = await fetch(`${BASE}/api/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (res.ok && data.valid) {
        setCouponState(p => ({
          ...p,
          [drawId]: { status: 'valid', discount_pct: data.discount_pct, type: data.type, error: null, message: data.message },
        }))
      } else {
        setCouponState(p => ({
          ...p,
          [drawId]: { status: 'invalid', discount_pct: 0, type: null, error: data.error || 'Invalid code', message: null },
        }))
      }
    } catch {
      setCouponState(p => ({
        ...p,
        [drawId]: { status: 'invalid', discount_pct: 0, type: null, error: 'Validation failed', message: null },
      }))
    }
  }

  const getEffectiveDiscount = (drawId: string): number => {
    if (hasActiveBonus) return user?.referral_bonus_pct ?? 0
    return couponState[drawId]?.discount_pct ?? 0
  }

  const canBuy = (drawId: string): boolean => {
    if (buying === drawId) return false
    const cs = couponState[drawId]
    const code = couponCode[drawId]?.trim()
    if (!code) return true
    return cs?.status === 'valid'
  }

  const buyTicket = async (draw: Draw) => {
    if (!canBuy(draw.id)) return
    const quantity = qty[draw.id] || 1
    const code = couponCode[draw.id]?.trim() || ''
    setBuying(draw.id)
    setDrawResult(p => ({ ...p, [draw.id]: null }))

    const res = await fetch(`${BASE}/api/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        draw_id: draw.id,
        quantity,
        ...(code ? { coupon_code: code } : {}),
      }),
    })
    const data = await res.json()
    setBuying(null)

    if (!res.ok) {
      setDrawResult(p => ({ ...p, [draw.id]: { ok: false, text: '❌ ' + (data.error || 'Purchase failed') } }))
      setTimeout(() => setDrawResult(p => ({ ...p, [draw.id]: null })), 4000)
      return
    }

    const discountNote = data.discount_applied > 0 ? ` · ${data.discount_applied}% off!` : ''
    setDrawResult(p => ({ ...p, [draw.id]: { ok: true, text: `✅ Bought ${quantity} ticket${quantity > 1 ? 's' : ''}! ৳${data.total_cost}${discountNote}` } }))
    setCouponCode(p => ({ ...p, [draw.id]: '' }))
    setCouponState(p => ({ ...p, [draw.id]: emptyCoupon() }))
    load()
    refresh()
    setTimeout(() => setDrawResult(p => ({ ...p, [draw.id]: null })), 4000)
  }

  const statusColor = (s: string) => {
    if (s === 'live') return '#e8187a'
    if (s === 'upcoming') return '#9b20d8'
    if (s === 'rescheduled') return '#f0a500'
    return '#8888aa'
  }

  const cardStyle: React.CSSProperties = {
    background: '#100f28', borderRadius: '16px',
    border: '1px solid rgba(155,32,216,0.2)', padding: '12px 15px', marginBottom: '14px',
  }

  return (
    <div className="app">
      <TopNav />
      <div style={{ padding: '18px 15px 100px' }}>
        <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '18px' }}>🏆 All Draws</h2>

        {/* My Partner Code */}
        {user?.partner_code && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(155,32,216,0.15), rgba(232,24,122,0.08))',
            border: '1.5px solid rgba(155,32,216,0.35)', borderRadius: '14px',
            padding: '12px 16px', marginBottom: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <p style={{ color: '#9b20d8', fontFamily: 'Poppins, sans-serif', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>🎟️ MY PARTNER CODE</p>
              <p style={{ color: '#fff', fontFamily: 'monospace', fontWeight: 800, fontSize: '20px', letterSpacing: '3px' }}>{user.partner_code}</p>
              <p style={{ color: '#8888aa', fontSize: '11px', marginTop: '2px' }}>Share this code — friends get a discount, you earn rewards!</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(user.partner_code!)
                  .then(() => alert('Partner code copied!'))
                  .catch(() => {})
              }}
              style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'rgba(155,32,216,0.2)', color: '#9b20d8', fontWeight: 700, fontSize: '12px', flexShrink: 0 }}
            >
              📋 Copy
            </button>
          </div>
        )}

        {/* Active Referral Bonus Banner */}
        {hasActiveBonus && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(240,165,0,0.15), rgba(232,24,122,0.1))',
            border: '1.5px solid rgba(240,165,0,0.5)', borderRadius: '14px',
            padding: '14px 16px', marginBottom: '18px',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            <span style={{ fontSize: '28px', flexShrink: 0 }}>🎁</span>
            <div>
              <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, color: '#f0a500', fontSize: '15px', marginBottom: '2px' }}>
                Partner Reward Active! {user.referral_bonus_pct}% Off
              </p>
              <p style={{ color: '#ccc', fontSize: '12px', fontFamily: 'Poppins, sans-serif' }}>
                Your next ticket gets {user.referral_bonus_pct}% discount automatically.
                Expires: {new Date(user.referral_bonus_expires!).toLocaleDateString('en-GB')}
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <p style={{ color: '#8888aa', textAlign: 'center', marginTop: '40px' }}>Loading draws...</p>
        ) : draws.length === 0 ? (
          <p style={{ color: '#8888aa', textAlign: 'center', marginTop: '40px' }}>No draws available right now.</p>
        ) : draws.map(draw => {
          const cs = couponState[draw.id]
          const effectiveDiscount = getEffectiveDiscount(draw.id)
          const discountedPrice = effectiveDiscount > 0
            ? Math.ceil(draw.ticket_price * (1 - effectiveDiscount / 100))
            : draw.ticket_price
          const totalPrice = discountedPrice * (qty[draw.id] || 1)
          const code = couponCode[draw.id] || ''
          const buyDisabled = !canBuy(draw.id)

          const drawCampaigns = campaigns.filter(c => c.draw_id === draw.id)
          const bogoCampaign = drawCampaigns.find(c => c.campaign_type === 'buy_x_get_y')
          const offerCampaign = drawCampaigns.find(c => c.campaign_type === 'special_offer')
          const activeCampaign = bogoCampaign || offerCampaign

          return (
            <div key={draw.id} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#fff', fontSize: '16px', marginBottom: '6px' }}>{draw.name}</h3>
                  <span style={{ background: 'rgba(0,0,0,0.25)', color: statusColor(draw.status), borderRadius: '20px', padding: '3px 12px', fontSize: '12px', fontWeight: 700, border: `1px solid ${statusColor(draw.status)}44` }}>
                    {draw.status === 'rescheduled' ? '🔄 RESCHEDULED' : draw.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: '#f0a500', fontFamily: 'Poppins, sans-serif', fontSize: '20px', fontWeight: 800 }}>{formatJackpot(draw.jackpot)}</p>
                  <p style={{ color: '#8888aa', fontSize: '12px' }}>Jackpot</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                {[
                  {
                    label: 'Ticket Price', value: effectiveDiscount > 0 ? (
                      <span>
                        <span style={{ textDecoration: 'line-through', color: '#8888aa', fontSize: '12px' }}>{formatCurrency(draw.ticket_price)}</span>
                        {' '}<span style={{ color: '#f0a500', fontWeight: 800 }}>{formatCurrency(discountedPrice)}</span>
                      </span>
                    ) : formatCurrency(draw.ticket_price),
                  },
                  { label: 'Time Left', value: getTimeLeft(draw.end_date) },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '10px' }}>
                    <p style={{ color: '#8888aa', fontSize: '11px', marginBottom: '3px' }}>{label}</p>
                    <p style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>{value}</p>
                  </div>
                ))}
              </div>

              {draw.status === 'ended' && draw.winner_name && (
                <div style={{ background: 'rgba(240,165,0,0.1)', borderRadius: '10px', padding: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '22px' }}>🏆</span>
                  <div>
                    <p style={{ color: '#f0a500', fontWeight: 700, fontSize: '14px' }}>Winner: {draw.winner_name}</p>
                    <p style={{ color: '#8888aa', fontSize: '12px' }}>Ticket: {draw.winner_ticket}</p>
                  </div>
                </div>
              )}

              {draw.status === 'rescheduled' && (
                <div style={{ background: 'rgba(240,165,0,0.08)', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px' }}>
                  <p style={{ color: '#f0a500', fontSize: '13px', fontWeight: 600 }}>🔄 This draw has been rescheduled. New date will be announced soon.</p>
                </div>
              )}

              {draw.status === 'live' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                  {/* Campaign Badge */}
                  {activeCampaign && (
                    <div style={{
                      background: bogoCampaign
                        ? 'linear-gradient(90deg, rgba(232,24,122,0.2), rgba(155,32,216,0.15))'
                        : 'linear-gradient(90deg, rgba(240,165,0,0.2), rgba(232,24,122,0.15))',
                      border: `1px solid ${bogoCampaign ? 'rgba(232,24,122,0.5)' : 'rgba(240,165,0,0.5)'}`,
                      borderRadius: '10px', padding: '8px 14px',
                      display: 'flex', alignItems: 'center', gap: '8px',
                    }}>
                      <span style={{ fontSize: '18px' }}>{bogoCampaign ? '🎁' : '🔥'}</span>
                      <div>
                        <p style={{
                          color: bogoCampaign ? '#e8187a' : '#f0a500',
                          fontWeight: 800, fontSize: '13px', fontFamily: 'Poppins, sans-serif',
                        }}>
                          {bogoCampaign ? 'BUY ONE GET ONE FREE' : '50% SPECIAL OFFER'}
                        </p>
                        <p style={{ color: '#ccc', fontSize: '11px', fontFamily: 'Poppins, sans-serif' }}>
                          {activeCampaign.title}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Coupon Code Input (only if no active bonus) */}
                  {!hasActiveBonus && (
                    <div>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: 'rgba(0,0,0,0.25)', borderRadius: '10px', padding: '10px 14px',
                        border: `1px solid ${
                          cs?.status === 'valid' ? 'rgba(80,200,80,0.5)'
                          : cs?.status === 'invalid' ? 'rgba(232,24,122,0.5)'
                          : cs?.status === 'checking' ? 'rgba(240,165,0,0.4)'
                          : 'rgba(155,32,216,0.2)'
                        }`,
                        transition: 'border-color 0.3s',
                      }}>
                        <span style={{ fontSize: '16px', flexShrink: 0 }}>🏷️</span>
                        <input
                          type="text"
                          value={code}
                          onChange={e => handleCouponChange(draw.id, e.target.value)}
                          placeholder="Enter coupon code (optional)"
                          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '13px', fontFamily: 'Poppins, sans-serif', letterSpacing: code ? '1px' : 0 }}
                        />
                        {cs?.status === 'checking' && (
                          <span style={{ color: '#f0a500', fontSize: '12px', flexShrink: 0 }}>Checking...</span>
                        )}
                        {cs?.status === 'valid' && (
                          <span style={{ color: '#4f4', fontSize: '16px', flexShrink: 0 }}>✓</span>
                        )}
                        {cs?.status === 'invalid' && (
                          <span style={{ color: '#e8187a', fontSize: '16px', flexShrink: 0 }}>✗</span>
                        )}
                      </div>
                      {/* Validation feedback */}
                      {cs?.status === 'valid' && cs.message && (
                        <p style={{ color: '#4f4', fontSize: '11px', marginTop: '5px', paddingLeft: '4px', fontFamily: 'Poppins, sans-serif' }}>
                          🎉 {cs.message}
                        </p>
                      )}
                      {cs?.status === 'invalid' && cs.error && (
                        <p style={{ color: '#e8187a', fontSize: '11px', marginTop: '5px', paddingLeft: '4px', fontFamily: 'Poppins, sans-serif' }}>
                          ⚠️ {cs.error}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Quantity + Buy row */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid rgba(155,32,216,0.4)', borderRadius: '10px', overflow: 'hidden' }}>
                      <button onClick={() => setQty(q => ({ ...q, [draw.id]: Math.max(1, (q[draw.id] || 1) - 1) }))} style={{ padding: '10px 14px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '16px' }}>−</button>
                      <span style={{ color: '#fff', padding: '0 8px', fontSize: '15px', fontWeight: 600 }}>{qty[draw.id] || 1}</span>
                      <button onClick={() => setQty(q => ({ ...q, [draw.id]: Math.min(20, (q[draw.id] || 1) + 1) }))} style={{ padding: '10px 14px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '16px' }}>+</button>
                    </div>
                    <button
                      onClick={() => !buyDisabled && !drawResult[draw.id] && buyTicket(draw)}
                      disabled={buyDisabled || !!drawResult[draw.id]}
                      style={{
                        flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                        cursor: (buyDisabled || !!drawResult[draw.id]) ? 'not-allowed' : 'pointer',
                        background: drawResult[draw.id]
                          ? drawResult[draw.id]!.ok
                            ? 'linear-gradient(90deg, #16a34a, #22c55e)'
                            : 'linear-gradient(90deg, #be123c, #e8187a)'
                          : buyDisabled
                            ? 'rgba(136,136,170,0.2)'
                            : effectiveDiscount > 0
                              ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                              : activeCampaign
                                ? bogoCampaign
                                  ? 'linear-gradient(90deg, #e8187a, #9b20d8)'
                                  : 'linear-gradient(90deg, #f0a500, #e8187a)'
                                : 'linear-gradient(90deg, #f0a500, #e8187a)',
                        color: buyDisabled && !drawResult[draw.id] ? '#8888aa' : '#fff',
                        fontWeight: 700, fontSize: '13px',
                        opacity: buying === draw.id ? 0.7 : 1,
                        transition: 'all 0.3s',
                        lineHeight: '1.3',
                        position: 'relative',
                      }}
                    >
                      {buying === draw.id
                        ? '⏳ Processing...'
                        : drawResult[draw.id]
                          ? drawResult[draw.id]!.text
                          : buyDisabled && code
                            ? cs?.status === 'checking' ? '⏳ Verifying...' : '🚫 Invalid Code'
                            : `Buy · ${formatCurrency(totalPrice)}${effectiveDiscount > 0 ? ` (${effectiveDiscount}% off)` : ''}`
                      }
                      {!buying && !drawResult[draw.id] && !buyDisabled && bogoCampaign && (
                        <span style={{
                          position: 'absolute', top: '-10px', right: '-4px',
                          background: '#f0a500', color: '#000', fontSize: '9px', fontWeight: 900,
                          padding: '2px 6px', borderRadius: '8px', letterSpacing: '0.5px',
                          boxShadow: '0 2px 6px rgba(240,165,0,0.5)',
                        }}>BOGO</span>
                      )}
                      {!buying && !drawResult[draw.id] && !buyDisabled && offerCampaign && !bogoCampaign && (
                        <span style={{
                          position: 'absolute', top: '-10px', right: '-4px',
                          background: '#e8187a', color: '#fff', fontSize: '9px', fontWeight: 900,
                          padding: '2px 6px', borderRadius: '8px', letterSpacing: '0.5px',
                          boxShadow: '0 2px 6px rgba(232,24,122,0.5)',
                        }}>50% OFF</span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <BottomNav />
    </div>
  )
}
