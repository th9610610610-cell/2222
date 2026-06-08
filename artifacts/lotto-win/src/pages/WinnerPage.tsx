import { useEffect, useState } from 'react'
import { Draw } from '../types'
import { formatJackpot, formatCurrency, formatDrawRef, formatDateTime } from '../lib/utils'
import { API_BASE } from '../lib/apiBase'

const BASE = API_BASE

interface WinnerTicket {
  id: string
  ticket_ref: string
  user_id: string
  user_name: string | null
  is_winner: boolean
  created_at: string
}

const VINTAGE_TEMPLATES = [
  { bg: '#c0392b', stubBg: '#a93226', border: '#e74c3c', text: '#fff', accent: '#ffcdd2', sideNum: true, star: true, label: 'LOTTO WIN' },
  { bg: '#1a2a4a', stubBg: '#121e36', border: '#2c4a8a', text: '#fff', accent: '#90caf9', sideNum: false, star: false, label: 'LUCKY DRAW' },
  { bg: '#c9950a', stubBg: '#a87e08', border: '#daa520', text: '#2a1800', accent: '#4a3000', sideNum: false, star: false, label: 'ADMIT ONE', admitOne: true },
  { bg: '#1a7575', stubBg: '#155e5e', border: '#20a0a0', text: '#fff', accent: '#80deea', sideNum: false, star: true, label: 'WINNER' },
  { bg: '#6a2fa0', stubBg: '#551f88', border: '#9b59d8', text: '#fff', accent: '#e040fb', sideNum: true, star: false, label: 'MEGA PRIZE' },
  { bg: '#c8b98a', stubBg: '#b09a6a', border: '#a0885a', text: '#2a1800', accent: '#4a3000', sideNum: false, star: false, label: 'PRIZE', barcode: true },
  { bg: '#4a5c2a', stubBg: '#384520', border: '#6a7c3a', text: '#fff', accent: '#c5e1a5', sideNum: false, star: true, label: 'SUPER WIN' },
  { bg: '#1a1a1a', stubBg: '#0d0d0d', border: '#3a3a3a', text: '#d4af37', accent: '#ffd700', sideNum: true, star: false, label: 'ROYAL', crown: true },
]

function VintageTicket({
  ticket, isWinner, canPick, picking, onPick, idx,
}: {
  ticket: WinnerTicket
  isWinner: boolean
  canPick: boolean
  picking: string | null
  onPick: (id: string) => void
  idx: number
}) {
  const tpl = isWinner
    ? { bg: '#1a1200', stubBg: '#0d0a00', border: '#d4af37', text: '#ffd700', accent: '#ffd700', sideNum: true, star: true, label: '🏆 WINNER', crown: true }
    : VINTAGE_TEMPLATES[idx % VINTAGE_TEMPLATES.length]

  const sideNum = ticket.ticket_ref.slice(-6).toUpperCase()

  return (
    <div
      onClick={() => canPick && !picking && onPick(ticket.id)}
      style={{
        position: 'relative',
        cursor: canPick ? 'pointer' : 'default',
        filter: isWinner ? 'drop-shadow(0 0 10px rgba(212,175,55,0.5))' : 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))',
        animation: isWinner ? 'winnerPulse 2s ease-in-out infinite' : 'none',
        marginBottom: '2px',
      }}
    >
      {/* Ticket body */}
      <div style={{
        display: 'flex',
        background: tpl.bg,
        borderRadius: '8px',
        border: `2px solid ${tpl.border}`,
        overflow: 'hidden',
        position: 'relative',
        minHeight: '70px',
      }}>
        {/* Left side numbers (for some templates) */}
        {tpl.sideNum && (
          <div style={{
            width: '20px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRight: `1.5px dashed ${tpl.text}44`,
            padding: '4px 2px',
          }}>
            <span style={{
              fontFamily: 'Courier New, monospace', fontSize: '8px',
              color: tpl.text, opacity: 0.6, letterSpacing: '1px',
              writingMode: 'vertical-rl', transform: 'rotate(180deg)',
            }}>{sideNum}</span>
          </div>
        )}

        {/* Main body */}
        <div style={{
          flex: 1, padding: '8px 10px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          position: 'relative',
        }}>
          {/* Inner border frame */}
          <div style={{
            position: 'absolute', inset: '4px',
            border: `1px solid ${tpl.text}30`,
            borderRadius: '4px',
            pointerEvents: 'none',
          }} />

          {/* Stars */}
          {tpl.star && (
            <>
              <span style={{ position: 'absolute', top: '6px', left: tpl.sideNum ? '8px' : '6px', color: tpl.text, fontSize: '9px', opacity: 0.7 }}>★</span>
              <span style={{ position: 'absolute', bottom: '6px', left: tpl.sideNum ? '8px' : '6px', color: tpl.text, fontSize: '9px', opacity: 0.7 }}>★</span>
            </>
          )}
          {(tpl as any).crown && (
            <span style={{ position: 'absolute', top: '5px', left: '50%', transform: 'translateX(-50%)', color: tpl.accent, fontSize: '10px' }}>♛</span>
          )}

          {/* Ticket number */}
          <div style={{ textAlign: 'center', paddingTop: (tpl as any).crown ? '12px' : '0' }}>
            <span style={{
              fontFamily: 'Arial Black, sans-serif', fontWeight: 900,
              fontSize: '16px', color: tpl.text,
              letterSpacing: '2px',
              textShadow: isWinner ? '0 0 10px rgba(255,215,0,0.8)' : 'none',
            }}>TKT-{ticket.ticket_ref}</span>
          </div>

          {/* Username */}
          {ticket.user_name && (
            <div style={{ textAlign: 'center', marginTop: '2px' }}>
              <span style={{ fontSize: '9px', color: tpl.text, opacity: 0.55, fontFamily: 'Poppins, sans-serif', letterSpacing: '0.5px' }}>
                {ticket.user_name.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Perforated divider + stub */}
        <div style={{
          width: '1.5px',
          background: `repeating-linear-gradient(to bottom, ${tpl.text}55 0, ${tpl.text}55 4px, transparent 4px, transparent 8px)`,
          flexShrink: 0,
        }} />

        {/* Stub / right side */}
        <div style={{
          width: '36px', flexShrink: 0,
          background: tpl.stubBg,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '4px 2px',
          gap: '4px',
        }}>
          {(tpl as any).admitOne ? (
            <span style={{
              fontFamily: 'Georgia, serif', fontSize: '7px',
              color: tpl.text, opacity: 0.8, letterSpacing: '1px',
              writingMode: 'vertical-rl', textAlign: 'center',
            }}>ADMIT ONE</span>
          ) : (tpl as any).barcode ? (
            <svg width="18" height="40" viewBox="0 0 18 40">
              {[0,1,2,3,4,5,6,7,8].map(i => (
                <rect key={i} x={i * 2} y="2" width={i % 3 === 0 ? 2 : 1} height="36"
                  fill={tpl.text} opacity="0.6" />
              ))}
            </svg>
          ) : (
            <span style={{
              fontFamily: 'Courier New, monospace', fontSize: '8px',
              color: tpl.text, opacity: 0.6, letterSpacing: '1px',
              writingMode: 'vertical-rl', transform: 'rotate(180deg)',
            }}>{sideNum}</span>
          )}
        </div>
      </div>

      {/* Loading overlay */}
      {picking === ticket.id && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: '20px', height: '20px', border: '2px solid #f0a500', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
        </div>
      )}

      {/* Hover highlight */}
      {canPick && (
        <div
          style={{ position: 'absolute', inset: 0, borderRadius: '8px', background: 'transparent', transition: 'background 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.07)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
        />
      )}
    </div>
  )
}

export default function WinnerPage() {
  const [draws, setDraws] = useState<Draw[]>([])
  const [selectedDraw, setSelectedDraw] = useState<Draw | null>(null)
  const [tickets, setTickets] = useState<WinnerTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [ticketsLoading, setTicketsLoading] = useState(false)
  const [picking, setPicking] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const adminToken = typeof window !== 'undefined' ? localStorage.getItem('lw_token') : null

  useEffect(() => {
    fetch(`${BASE}/api/winner/draws`)
      .then(r => r.json())
      .then(d => {
        const all: Draw[] = d.draws || []
        setDraws(all)
        const live = all.find(d => d.status === 'live')
        if (live) loadTickets(live)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const loadTickets = async (draw: Draw) => {
    setSelectedDraw(draw)
    setTickets([])
    setTicketsLoading(true)
    try {
      const res = await fetch(`${BASE}/api/winner/${draw.id}`)
      const data = await res.json()
      setTickets(data.tickets || [])
    } catch {}
    setTicketsLoading(false)
  }

  const pickWinner = async (ticketId: string) => {
    if (!selectedDraw || !adminToken) return
    setPicking(ticketId)
    setMsg(null)
    try {
      const res = await fetch(`${BASE}/api/winner/${selectedDraw.id}/pick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ ticket_id: ticketId }),
      })
      const data = await res.json()
      if (res.ok) {
        setMsg({ type: 'ok', text: `🏆 Winner: ${data.winner_name} — Ticket #${data.winner_ticket}` })
        loadTickets(selectedDraw)
        const updatedDraws = draws.map(d => d.id === selectedDraw.id
          ? { ...d, status: 'ended' as const, winner_name: data.winner_name, winner_ticket: data.winner_ticket }
          : d)
        setDraws(updatedDraws)
        setSelectedDraw(prev => prev
          ? { ...prev, status: 'ended', winner_name: data.winner_name, winner_ticket: data.winner_ticket }
          : prev)
      } else {
        setMsg({ type: 'err', text: data.error || 'Failed to pick winner' })
      }
    } catch {
      setMsg({ type: 'err', text: 'Network error' })
    }
    setPicking(null)
  }

  const statusColor = (s: string) => {
    if (s === 'live') return '#e8187a'
    if (s === 'upcoming') return '#9b20d8'
    if (s === 'rescheduled') return '#f0a500'
    return '#8888aa'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#08071a', padding: '0 0 40px' }}>
      <style>{`
        @keyframes winnerPulse {
          0%, 100% { filter: drop-shadow(0 0 6px rgba(212,175,55,0.5)); }
          50% { filter: drop-shadow(0 0 18px rgba(212,175,55,0.9)); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ padding: '20px 16px 0' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <span style={{ fontSize: '22px' }}>🏆</span>
          <h2 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 900, fontSize: '20px', color: '#fff', margin: 0 }}>Winner Page</h2>
        </div>
        <p style={{ color: '#8888aa', fontSize: '13px', fontFamily: 'Poppins, sans-serif', marginBottom: '20px' }}>
          All tickets — shuffled for fairness.
          {adminToken && <span style={{ color: '#f0a500', marginLeft: '6px', fontWeight: 700 }}>Admin: Tap any ticket to pick as winner.</span>}
        </p>

        {/* Message */}
        {msg && (
          <div style={{
            background: msg.type === 'ok' ? 'rgba(80,200,80,0.15)' : 'rgba(232,24,122,0.15)',
            border: `1px solid ${msg.type === 'ok' ? 'rgba(80,200,80,0.4)' : 'rgba(232,24,122,0.4)'}`,
            borderRadius: '12px', padding: '14px', marginBottom: '16px',
            color: msg.type === 'ok' ? '#4ade80' : '#f88',
            fontFamily: 'Poppins, sans-serif', fontSize: '14px', fontWeight: 600,
          }}>{msg.text}</div>
        )}

        {loading ? (
          <p style={{ color: '#8888aa', textAlign: 'center', marginTop: '40px' }}>Loading draws...</p>
        ) : (
          <>
            {/* Draw Selector */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '20px' }}>
              {draws.length === 0 ? (
                <p style={{ color: '#8888aa', fontSize: '13px' }}>No draws available.</p>
              ) : draws.map(draw => (
                <button key={draw.id} onClick={() => loadTickets(draw)} style={{
                  flexShrink: 0, padding: '10px 16px', borderRadius: '50px',
                  border: `1.5px solid ${selectedDraw?.id === draw.id ? statusColor(draw.status) : 'rgba(155,32,216,0.3)'}`,
                  background: selectedDraw?.id === draw.id ? 'rgba(0,0,0,0.3)' : 'transparent',
                  color: selectedDraw?.id === draw.id ? '#fff' : '#9988cc',
                  cursor: 'pointer', fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '13px',
                  whiteSpace: 'nowrap',
                }}>
                  <span style={{ color: statusColor(draw.status), marginRight: '5px' }}>●</span>
                  {draw.name}
                </button>
              ))}
            </div>

            {/* Selected Draw Info */}
            {selectedDraw && (
              <div style={{
                background: 'linear-gradient(135deg, #1a0b38 0%, #0d1540 100%)',
                borderRadius: '16px', border: '1px solid rgba(155,32,216,0.3)',
                padding: '16px 18px', marginBottom: '20px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, color: '#fff', fontSize: '16px', display: 'block' }}>{selectedDraw.name}</span>
                    <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '11px', color: 'rgba(155,32,216,0.9)', letterSpacing: '1.5px', marginTop: '3px', display: 'block' }}>{formatDrawRef(selectedDraw.id)}</span>
                  </div>
                  <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#f0a500', fontSize: '18px' }}>{formatJackpot(selectedDraw.jackpot)}</span>
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#8888aa', fontFamily: 'Poppins, sans-serif', flexWrap: 'wrap' }}>
                  <span>Tickets: <strong style={{ color: '#fff' }}>{tickets.length}</strong></span>
                  <span>Price: <strong style={{ color: '#fff' }}>{formatCurrency(selectedDraw.ticket_price)}</strong></span>
                  <span>Ends: <strong style={{ color: '#ccc' }}>{formatDateTime(selectedDraw.end_date)}</strong></span>
                  <span style={{ color: statusColor(selectedDraw.status), fontWeight: 700 }}>{selectedDraw.status.toUpperCase()}</span>
                </div>

                {selectedDraw.winner_name && (
                  <div style={{
                    marginTop: '14px',
                    background: 'linear-gradient(90deg, rgba(240,165,0,0.2), rgba(232,24,122,0.2))',
                    borderRadius: '12px', padding: '14px 16px',
                    border: '1px solid rgba(240,165,0,0.4)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '28px' }}>🏆</span>
                      <div>
                        <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, color: '#f0a500', fontSize: '15px', marginBottom: '2px' }}>Winner Announced!</p>
                        <p style={{ color: '#fff', fontSize: '14px', fontFamily: 'Poppins, sans-serif' }}>
                          <strong>{selectedDraw.winner_name}</strong> — Ticket <strong style={{ color: '#f0a500' }}>#{selectedDraw.winner_ticket}</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tickets Grid */}
            {selectedDraw && (
              ticketsLoading ? (
                <p style={{ color: '#8888aa', textAlign: 'center', padding: '30px 0' }}>Loading tickets...</p>
              ) : tickets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎟️</div>
                  <p style={{ color: '#8888aa', fontFamily: 'Poppins, sans-serif' }}>No tickets purchased yet for this draw.</p>
                </div>
              ) : (
                <>
                  <p style={{ color: '#8888aa', fontSize: '12px', fontFamily: 'Poppins, sans-serif', marginBottom: '12px', textAlign: 'center' }}>
                    {tickets.length} tickets · shuffled for fairness
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {tickets.map((ticket, idx) => (
                      <VintageTicket
                        key={ticket.id}
                        ticket={ticket}
                        isWinner={ticket.is_winner}
                        canPick={!!(adminToken && selectedDraw.status === 'live' && !selectedDraw.winner_name)}
                        picking={picking}
                        onPick={pickWinner}
                        idx={idx}
                      />
                    ))}
                  </div>
                </>
              )
            )}
          </>
        )}
      </div>
    </div>
  )
}
