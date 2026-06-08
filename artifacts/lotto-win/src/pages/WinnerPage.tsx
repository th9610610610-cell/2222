import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import TopNav from '../components/TopNav'
import BottomNav from '../components/BottomNav'
import { Draw } from '../types'
import { formatJackpot, formatCurrency } from '../lib/utils'
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

export default function WinnerPage() {
  const [, navigate] = useLocation()
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
    if (!selectedDraw) return
    if (!adminToken) return
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
        const updatedDraws = draws.map(d => d.id === selectedDraw.id ? { ...d, status: 'ended' as const, winner_name: data.winner_name, winner_ticket: data.winner_ticket } : d)
        setDraws(updatedDraws)
        setSelectedDraw(prev => prev ? { ...prev, status: 'ended', winner_name: data.winner_name, winner_ticket: data.winner_ticket } : prev)
      } else {
        setMsg({ type: 'err', text: data.error || 'Failed to pick winner' })
      }
    } catch (e: any) {
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
    <div className="app">
      <style>{`
        @keyframes ticketShimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes winnerPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(240,165,0,0.5); }
          50% { box-shadow: 0 0 0 8px rgba(240,165,0,0); }
        }
        @keyframes confettiFall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(40px) rotate(360deg); opacity: 0; }
        }
      `}</style>
      <TopNav />
      <div style={{ padding: '16px 16px 120px' }}>

        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '24px' }}>🏆</span>
            <h2 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 900, fontSize: '22px', color: '#fff', margin: 0 }}>Winner Page</h2>
          </div>
          <p style={{ color: '#8888aa', fontSize: '13px', fontFamily: 'Poppins, sans-serif' }}>
            All tickets for each draw — shuffled for fairness.
            {adminToken && <span style={{ color: '#f0a500', marginLeft: '6px', fontWeight: 700 }}>Admin Mode: Tap any ticket to pick as winner.</span>}
          </p>
        </div>

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
                  background: selectedDraw?.id === draw.id ? `rgba(0,0,0,0.3)` : 'transparent',
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, color: '#fff', fontSize: '16px' }}>{selectedDraw.name}</span>
                  <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#f0a500', fontSize: '18px' }}>{formatJackpot(selectedDraw.jackpot)}</span>
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#8888aa', fontFamily: 'Poppins, sans-serif' }}>
                  <span>Tickets: <strong style={{ color: '#fff' }}>{tickets.length}</strong></span>
                  <span>Price: <strong style={{ color: '#fff' }}>{formatCurrency(selectedDraw.ticket_price)}</strong></span>
                  <span style={{ color: statusColor(selectedDraw.status), fontWeight: 700 }}>{selectedDraw.status.toUpperCase()}</span>
                </div>

                {/* Winner Banner */}
                {selectedDraw.winner_name && (
                  <div style={{
                    marginTop: '14px', background: 'linear-gradient(90deg, rgba(240,165,0,0.2), rgba(232,24,122,0.2))',
                    borderRadius: '12px', padding: '14px 16px',
                    border: '1px solid rgba(240,165,0,0.4)',
                    animation: 'winnerPulse 2s ease-in-out infinite',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '28px' }}>🏆</span>
                      <div>
                        <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, color: '#f0a500', fontSize: '15px', marginBottom: '2px' }}>Winner Announced!</p>
                        <p style={{ color: '#fff', fontSize: '14px', fontFamily: 'Poppins, sans-serif' }}><strong>{selectedDraw.winner_name}</strong> — Ticket <strong style={{ color: '#f0a500' }}>#{selectedDraw.winner_ticket}</strong></p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tickets List */}
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
                    {tickets.map(ticket => {
                      const isWinner = ticket.is_winner
                      const canPick = adminToken && selectedDraw.status === 'live' && !selectedDraw.winner_name
                      return (
                        <div key={ticket.id} style={{
                          background: isWinner
                            ? 'linear-gradient(135deg, rgba(240,165,0,0.2), rgba(232,24,122,0.2))'
                            : 'linear-gradient(135deg, #13112e, #0d0c22)',
                          borderRadius: '14px',
                          border: isWinner
                            ? '2px solid rgba(240,165,0,0.7)'
                            : '1px solid rgba(155,32,216,0.2)',
                          padding: '14px 12px',
                          cursor: canPick ? 'pointer' : 'default',
                          position: 'relative', overflow: 'hidden',
                          animation: isWinner ? 'winnerPulse 2s ease-in-out infinite' : 'none',
                          transition: 'transform 0.15s, border-color 0.2s',
                        }}
                          onClick={() => canPick && !picking && pickWinner(ticket.id)}
                        >
                          {isWinner && (
                            <div style={{ position: 'absolute', top: '6px', right: '6px' }}>
                              <span style={{ fontSize: '14px' }}>🏆</span>
                            </div>
                          )}
                          {canPick && (
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(240,165,0,0)', borderRadius: '14px', transition: 'background 0.2s' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(240,165,0,0.08)' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(240,165,0,0)' }}
                            />
                          )}

                          {/* Ticket icon */}
                          <div style={{ marginBottom: '8px' }}>
                            <svg width="28" height="18" viewBox="0 0 48 30" fill="none">
                              <path d="M4 0 H44 A4 4 0 0 1 48 4 V10 A5 5 0 0 0 48 20 V26 A4 4 0 0 1 44 30 H4 A4 4 0 0 1 0 26 V20 A5 5 0 0 0 0 10 V4 A4 4 0 0 1 4 0 Z"
                                fill={isWinner ? 'rgba(240,165,0,0.2)' : 'rgba(155,32,216,0.12)'}
                                stroke={isWinner ? '#f0a500' : '#9b20d8'} strokeWidth="2" />
                              <line x1="16" y1="2" x2="16" y2="28" stroke={isWinner ? '#f0a500' : '#9b20d8'} strokeWidth="1.4" strokeDasharray="3 2.5" />
                            </svg>
                          </div>

                          <p style={{
                            fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: '15px',
                            color: isWinner ? '#f0a500' : '#fff',
                            marginBottom: '4px', letterSpacing: '1px',
                          }}>#{ticket.ticket_ref}</p>
                          {ticket.user_name && (
                            <p style={{ color: '#8888aa', fontSize: '11px', fontFamily: 'Poppins, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {ticket.user_name}
                            </p>
                          )}
                          {picking === ticket.id && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '14px' }}>
                              <div style={{ width: '20px', height: '20px', border: '2px solid #f0a500', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              )
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
