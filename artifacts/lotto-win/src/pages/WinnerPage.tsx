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

const TICKET_COLORS = [
  { bg: '#c8b98a', text: '#2a1800', accent: '#6b3a1f' },
  { bg: '#1a2a4a', text: '#fff', accent: '#90caf9' },
  { bg: '#c0392b', text: '#fff', accent: '#ffcdd2' },
  { bg: '#1a7575', text: '#fff', accent: '#80deea' },
  { bg: '#6a2fa0', text: '#fff', accent: '#e040fb' },
  { bg: '#4a5c2a', text: '#fff', accent: '#c5e1a5' },
  { bg: '#c9950a', text: '#2a1800', accent: '#4a3000' },
  { bg: '#1a1a1a', text: '#d4af37', accent: '#ffd700' },
]

function ClassicTicket({
  ticket, isWinner, canPick, picking, onPick, idx,
}: {
  ticket: WinnerTicket
  isWinner: boolean
  canPick: boolean
  picking: string | null
  onPick: (id: string) => void
  idx: number
}) {
  const palette = isWinner
    ? { bg: '#1a1200', text: '#ffd700', accent: '#ffd700' }
    : TICKET_COLORS[idx % TICKET_COLORS.length]

  return (
    <div
      onClick={() => canPick && !picking && onPick(ticket.id)}
      title={`TKT-${ticket.ticket_ref}${ticket.user_name ? ` · ${ticket.user_name}` : ''}`}
      style={{
        position: 'relative',
        cursor: canPick ? 'pointer' : 'default',
        filter: isWinner
          ? 'drop-shadow(0 0 6px rgba(212,175,55,0.7))'
          : 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))',
        animation: isWinner ? 'winnerPulse 2s ease-in-out infinite' : 'none',
      }}
    >
      {/* Ticket shape */}
      <div style={{
        display: 'flex',
        background: palette.bg,
        borderRadius: '5px',
        border: `1.5px solid ${palette.accent}55`,
        overflow: 'hidden',
        height: '52px',
        position: 'relative',
      }}>
        {/* Wavy perforated left edge */}
        <div style={{
          width: '6px', flexShrink: 0,
          background: `repeating-linear-gradient(to bottom, ${palette.accent}44 0, ${palette.accent}44 3px, transparent 3px, transparent 6px)`,
          borderRight: `1px dashed ${palette.accent}55`,
        }} />

        {/* Main body */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3px 4px',
          position: 'relative',
        }}>
          {/* Inner frame */}
          <div style={{
            position: 'absolute', inset: '3px',
            border: `1px solid ${palette.accent}33`,
            borderRadius: '3px',
            pointerEvents: 'none',
          }} />

          {isWinner && (
            <span style={{ position: 'absolute', top: '2px', left: '50%', transform: 'translateX(-50%)', color: palette.accent, fontSize: '8px' }}>♛</span>
          )}

          <span style={{
            fontFamily: 'Arial Black, sans-serif',
            fontWeight: 900,
            fontSize: '9px',
            color: palette.text,
            letterSpacing: '0.5px',
            textAlign: 'center',
            lineHeight: 1.2,
            zIndex: 1,
            paddingTop: isWinner ? '8px' : '0',
          }}>
            TKT-{ticket.ticket_ref}
          </span>
          {ticket.user_name && (
            <span style={{
              fontSize: '6px', color: palette.text, opacity: 0.55,
              fontFamily: 'Poppins, sans-serif', letterSpacing: '0.2px',
              overflow: 'hidden', maxWidth: '100%', textAlign: 'center',
              whiteSpace: 'nowrap', textOverflow: 'ellipsis',
            }}>
              {ticket.user_name.toUpperCase().slice(0, 8)}
            </span>
          )}
        </div>

        {/* Perforated divider */}
        <div style={{
          width: '1.5px',
          background: `repeating-linear-gradient(to bottom, ${palette.text}55 0, ${palette.text}55 3px, transparent 3px, transparent 6px)`,
          flexShrink: 0,
        }} />

        {/* Barcode stub */}
        <div style={{
          width: '18px', flexShrink: 0,
          background: `${palette.bg}cc`,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '4px 2px',
        }}>
          <svg width="10" height="36" viewBox="0 0 10 36">
            {[0,1,2,3,4,5,6,7,8,9].map(i => (
              <rect key={i} x={i} y={i % 3 === 0 ? 0 : 2} width={i % 4 === 0 ? 2 : 1} height={i % 3 === 0 ? 36 : 32}
                fill={palette.text} opacity={0.5 + (i % 3) * 0.15} />
            ))}
          </svg>
        </div>
      </div>

      {/* Loading overlay */}
      {picking === ticket.id && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
          borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: '14px', height: '14px', border: '2px solid #f0a500', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
        </div>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <span style={{ fontSize: '22px' }}>🏆</span>
          <h2 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 900, fontSize: '20px', color: '#fff', margin: 0 }}>Winner Page</h2>
        </div>
        <p style={{ color: '#8888aa', fontSize: '13px', fontFamily: 'Poppins, sans-serif', marginBottom: '20px' }}>
          All tickets — shuffled for fairness.
          {adminToken && <span style={{ color: '#f0a500', marginLeft: '6px', fontWeight: 700 }}>Admin: Tap any ticket to pick as winner.</span>}
        </p>

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

            {/* Tickets Grid — 6 per row */}
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
                  <p style={{ color: '#8888aa', fontSize: '12px', fontFamily: 'Poppins, sans-serif', marginBottom: '10px', textAlign: 'center' }}>
                    {tickets.length} tickets · shuffled for fairness
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '5px' }}>
                    {tickets.map((ticket, idx) => (
                      <ClassicTicket
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
