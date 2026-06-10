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

function LottoTicket({
  ticket, isWinner, canPick, picking, onPick,
}: {
  ticket: WinnerTicket
  isWinner: boolean
  canPick: boolean
  picking: string | null
  onPick: (id: string) => void
}) {
  const bg = isWinner ? '#ffd700' : '#d4b896'
  const border = isWinner ? '#b8860b' : '#a0845a'
  const textColor = isWinner ? '#3a2000' : '#3a2000'

  return (
    <div
      onClick={() => canPick && !picking && onPick(ticket.id)}
      title={`TKT-${ticket.ticket_ref}`}
      style={{
        position: 'relative',
        cursor: canPick ? 'pointer' : 'default',
        height: '25px',
        filter: isWinner ? 'drop-shadow(0 0 4px rgba(255,215,0,0.8))' : 'none',
        animation: isWinner ? 'winnerPulse 2s ease-in-out infinite' : 'none',
      }}
    >
      {/* Ticket shape with notched edges */}
      <div style={{
        position: 'absolute', inset: 0,
        background: bg,
        borderRadius: '4px',
        border: `1.5px solid ${border}`,
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
      }}>
        {/* Notch left */}
        <div style={{
          position: 'absolute', left: '-5px', top: '50%', transform: 'translateY(-50%)',
          width: '10px', height: '10px', borderRadius: '50%',
          background: '#08071a', border: `1px solid ${border}`,
          zIndex: 2, flexShrink: 0,
        }} />
        {/* Notch right */}
        <div style={{
          position: 'absolute', right: '-5px', top: '50%', transform: 'translateY(-50%)',
          width: '10px', height: '10px', borderRadius: '50%',
          background: '#08071a', border: `1px solid ${border}`,
          zIndex: 2, flexShrink: 0,
        }} />

        {/* Inner dashed border */}
        <div style={{
          position: 'absolute', inset: '2px',
          border: `1px dashed ${border}66`,
          borderRadius: '3px',
          pointerEvents: 'none',
        }} />

        {/* Main text area */}
        <div style={{
          flex: 1, paddingLeft: '8px', paddingRight: '4px',
          display: 'flex', alignItems: 'center',
        }}>
          <span style={{
            fontFamily: 'Arial Black, sans-serif',
            fontWeight: 900, fontSize: '10px',
            color: textColor, letterSpacing: '0.3px',
            whiteSpace: 'nowrap', overflow: 'hidden',
          }}>
            TKT-{ticket.ticket_ref}
          </span>
        </div>

        {/* Perforated separator */}
        <div style={{
          width: '1.5px', height: '100%', flexShrink: 0,
          background: `repeating-linear-gradient(to bottom, ${border}99 0, ${border}99 3px, transparent 3px, transparent 6px)`,
        }} />

        {/* Barcode stub */}
        <div style={{
          width: '20px', flexShrink: 0, height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          paddingRight: '3px',
        }}>
          <svg width="12" height="18" viewBox="0 0 12 18">
            {[0,1,2,3,4,5,6,7,8,9,10].map(i => (
              <rect key={i}
                x={i * 1.1} y={i % 3 === 0 ? 0 : 1}
                width={i % 4 === 0 ? 1.2 : 0.7}
                height={i % 3 === 0 ? 18 : 16}
                fill={textColor} opacity={0.6 + (i % 3) * 0.12}
              />
            ))}
          </svg>
        </div>
      </div>

      {/* Loading overlay */}
      {picking === ticket.id && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
          borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: '10px', height: '10px', border: '1.5px solid #f0a500', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
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
          0%, 100% { filter: drop-shadow(0 0 4px rgba(255,215,0,0.6)); }
          50% { filter: drop-shadow(0 0 12px rgba(255,215,0,1)); }
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

            {/* Tickets Grid — 5 per row, compact lotto style */}
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
                  <p style={{ color: '#8888aa', fontSize: '12px', fontFamily: 'Poppins, sans-serif', marginBottom: '8px', textAlign: 'center' }}>
                    {tickets.length} tickets · shuffled for fairness
                  </p>
                  <div style={{
                    width: '90vw', margin: '0 auto',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: '4px',
                  }}>
                    {tickets.map((ticket) => (
                      <LottoTicket
                        key={ticket.id}
                        ticket={ticket}
                        isWinner={ticket.is_winner}
                        canPick={!!(adminToken && selectedDraw.status === 'live' && !selectedDraw.winner_name)}
                        picking={picking}
                        onPick={pickWinner}
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
