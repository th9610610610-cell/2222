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

const CARD_TEMPLATES = [
  { bg: 'linear-gradient(135deg, #1a0b38 0%, #0d1540 100%)', accent: '#9b20d8', stripe: '#7b10b8', label: 'LOTTO' },
  { bg: 'linear-gradient(135deg, #1a0520 0%, #2d0a10 100%)', accent: '#e8187a', stripe: '#c8106a', label: 'LUCKY' },
  { bg: 'linear-gradient(135deg, #0a1a30 0%, #0d2040 100%)', accent: '#22d3ee', stripe: '#10b8cc', label: 'DRAW' },
  { bg: 'linear-gradient(135deg, #1a1500 0%, #2a2000 100%)', accent: '#f0a500', stripe: '#d09000', label: 'GOLD' },
  { bg: 'linear-gradient(135deg, #001a0a 0%, #002a14 100%)', accent: '#4ade80', stripe: '#2ab860', label: 'WIN' },
  { bg: 'linear-gradient(135deg, #1a0010 0%, #300020 100%)', accent: '#f472b6', stripe: '#e060a0', label: 'PRIZE' },
  { bg: 'linear-gradient(135deg, #0a0a1a 0%, #12122a 100%)', accent: '#a78bfa', stripe: '#8b70e0', label: 'MEGA' },
  { bg: 'linear-gradient(135deg, #1a0a00 0%, #2a1500 100%)', accent: '#fb923c', stripe: '#e07820', label: 'SUPER' },
]

function TicketCard({
  ticket,
  isWinner,
  canPick,
  picking,
  onPick,
  idx,
}: {
  ticket: WinnerTicket
  isWinner: boolean
  canPick: boolean
  picking: string | null
  onPick: (id: string) => void
  idx: number
}) {
  const tpl = isWinner
    ? { bg: 'linear-gradient(135deg, #2a1800 0%, #3a2200 100%)', accent: '#f0a500', stripe: '#d09000', label: 'WIN' }
    : CARD_TEMPLATES[idx % CARD_TEMPLATES.length]

  return (
    <div
      onClick={() => canPick && !picking && onPick(ticket.id)}
      style={{
        background: tpl.bg,
        borderRadius: '14px',
        border: isWinner ? '2px solid #f0a500' : `1.5px solid ${tpl.accent}44`,
        overflow: 'hidden',
        cursor: canPick ? 'pointer' : 'default',
        position: 'relative',
        boxShadow: isWinner
          ? '0 0 20px rgba(240,165,0,0.35), 0 4px 16px rgba(0,0,0,0.5)'
          : '0 4px 12px rgba(0,0,0,0.4)',
        animation: isWinner ? 'winnerPulse 2s ease-in-out infinite' : 'none',
        transition: 'transform 0.15s',
      }}
    >
      {/* Top colored stripe */}
      <div style={{
        height: '6px',
        background: isWinner
          ? 'linear-gradient(90deg, #f0a500, #e8187a, #f0a500)'
          : `linear-gradient(90deg, ${tpl.accent}, ${tpl.stripe}, ${tpl.accent})`,
      }} />

      {/* Main content */}
      <div style={{ padding: '10px 12px 8px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{
            fontFamily: 'Poppins, sans-serif', fontWeight: 900, fontSize: '9px',
            color: isWinner ? '#f0a500' : tpl.accent, letterSpacing: '2px',
          }}>{isWinner ? '🏆 WINNER' : tpl.label}</span>
          {isWinner && <span style={{ fontSize: '14px' }}>🏆</span>}
        </div>

        {/* Ticket icon + perforated line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <svg width="32" height="20" viewBox="0 0 48 30" fill="none" style={{ flexShrink: 0 }}>
            <path
              d="M4 0 H44 A4 4 0 0 1 48 4 V10 A5 5 0 0 0 48 20 V26 A4 4 0 0 1 44 30 H4 A4 4 0 0 1 0 26 V20 A5 5 0 0 0 0 10 V4 A4 4 0 0 1 4 0 Z"
              fill={isWinner ? 'rgba(240,165,0,0.18)' : `${tpl.accent}22`}
              stroke={isWinner ? '#f0a500' : tpl.accent}
              strokeWidth="2"
            />
            <line x1="16" y1="2" x2="16" y2="28"
              stroke={isWinner ? '#f0a500' : tpl.accent}
              strokeWidth="1.4" strokeDasharray="3 2.5" />
          </svg>
          <div style={{ flex: 1, height: '1px', backgroundImage: `repeating-linear-gradient(90deg, ${isWinner ? '#f0a500' : tpl.accent}55 0, ${isWinner ? '#f0a500' : tpl.accent}55 4px, transparent 4px, transparent 8px)` }} />
        </div>

        {/* Ticket number */}
        <p style={{
          fontFamily: 'Courier New, monospace', fontWeight: 900, fontSize: '14px',
          color: isWinner ? '#f0a500' : '#fff',
          letterSpacing: '2px', marginBottom: '4px',
          textShadow: isWinner ? '0 0 12px rgba(240,165,0,0.6)' : 'none',
        }}>#{ticket.ticket_ref}</p>

        {ticket.user_name && (
          <p style={{
            color: '#8888aa', fontSize: '10px', fontFamily: 'Poppins, sans-serif',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            marginBottom: '6px',
          }}>{ticket.user_name}</p>
        )}
      </div>

      {/* Bottom barcode strip */}
      <div style={{
        height: '20px', margin: '0 12px 10px',
        background: `repeating-linear-gradient(90deg, ${isWinner ? '#f0a500' : tpl.accent}cc 0, ${isWinner ? '#f0a500' : tpl.accent}cc 2px, transparent 2px, transparent 4px)`,
        borderRadius: '2px', opacity: 0.4,
      }} />

      {/* Hover overlay for clickable */}
      {canPick && (
        <div style={{
          position: 'absolute', inset: 0, background: `${tpl.accent}00`,
          borderRadius: '14px', transition: 'background 0.2s',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = `${tpl.accent}12` }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = `${tpl.accent}00` }}
        />
      )}

      {/* Loading spinner */}
      {picking === ticket.id && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '14px',
        }}>
          <div style={{ width: '20px', height: '20px', border: '2px solid #f0a500', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
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
          0%, 100% { box-shadow: 0 0 0 0 rgba(240,165,0,0.5); }
          50% { box-shadow: 0 0 0 8px rgba(240,165,0,0); }
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
                    animation: 'winnerPulse 2s ease-in-out infinite',
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {tickets.map((ticket, idx) => (
                      <TicketCard
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
