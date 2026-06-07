import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { useAuth } from '../lib/auth'
import TopNav from '../components/TopNav'
import BottomNav from '../components/BottomNav'
import { Draw } from '../types'
import { formatCurrency, formatJackpot, getTimeLeft } from '../lib/utils'

import { API_BASE } from '../lib/apiBase'
const BASE = API_BASE

export default function DrawsPage() {
  const [, navigate] = useLocation()
  const { user, token } = useAuth()
  const [draws, setDraws] = useState<Draw[]>([])
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<string | null>(null)
  const [qty, setQty] = useState<Record<string, number>>({})
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    load()
  }, [token])

  const load = () => {
    fetch(`${BASE}/api/draws`)
      .then(r => r.json())
      .then(d => { setDraws(d.draws || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  const buyTicket = async (draw: Draw) => {
    const quantity = qty[draw.id] || 1
    setBuying(draw.id)
    setMsg(null)
    const res = await fetch(`${BASE}/api/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ draw_id: draw.id, quantity }),
    })
    const data = await res.json()
    setBuying(null)
    if (!res.ok) { setMsg({ type: 'err', text: data.error || 'Purchase failed' }); return }
    setMsg({ type: 'ok', text: `🎉 ${quantity} ticket(s) purchased!` })
    load()
  }

  const statusColor = (s: string) => {
    if (s === 'live') return '#e8187a'
    if (s === 'upcoming') return '#9b20d8'
    if (s === 'rescheduled') return '#f0a500'
    return '#8888aa'
  }
  const cardStyle: React.CSSProperties = { background: '#100f28', borderRadius: '16px', border: '1px solid rgba(155,32,216,0.2)', padding: '12px 15px', marginBottom: '14px' }

  return (
    <div className="app">
      <TopNav />
      <div style={{ padding: '18px 15px 100px' }}>
        <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '18px' }}>🏆 All Draws</h2>

        {msg && (
          <div style={{ background: msg.type === 'ok' ? 'rgba(80,200,80,0.15)' : 'rgba(232,24,122,0.15)', border: `1px solid ${msg.type === 'ok' ? 'rgba(80,200,80,0.4)' : 'rgba(232,24,122,0.4)'}`, borderRadius: '10px', padding: '12px', color: msg.type === 'ok' ? '#4f4' : '#f88', fontSize: '14px', marginBottom: '16px' }}>
            {msg.text}
          </div>
        )}

        {loading ? (
          <p style={{ color: '#8888aa', textAlign: 'center', marginTop: '40px' }}>Loading draws...</p>
        ) : draws.length === 0 ? (
          <p style={{ color: '#8888aa', textAlign: 'center', marginTop: '40px' }}>No draws available right now.</p>
        ) : draws.map(draw => (
          <div key={draw.id} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#fff', fontSize: '16px', marginBottom: '6px' }}>{draw.name}</h3>
                <span style={{ background: `rgba(0,0,0,0.25)`, color: statusColor(draw.status), borderRadius: '20px', padding: '3px 12px', fontSize: '12px', fontWeight: 700, border: `1px solid ${statusColor(draw.status)}44` }}>
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
                { label: 'Ticket Price', value: formatCurrency(draw.ticket_price) },
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
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid rgba(155,32,216,0.4)', borderRadius: '10px', overflow: 'hidden' }}>
                  <button onClick={() => setQty(q => ({ ...q, [draw.id]: Math.max(1, (q[draw.id] || 1) - 1) }))} style={{ padding: '10px 14px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '16px' }}>−</button>
                  <span style={{ color: '#fff', padding: '0 8px', fontSize: '15px', fontWeight: 600 }}>{qty[draw.id] || 1}</span>
                  <button onClick={() => setQty(q => ({ ...q, [draw.id]: Math.min(20, (q[draw.id] || 1) + 1) }))} style={{ padding: '10px 14px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '16px' }}>+</button>
                </div>
                <button onClick={() => buyTicket(draw)} disabled={buying === draw.id} style={{
                  flex: 1, padding: '12px', borderRadius: '10px', border: 'none', cursor: buying === draw.id ? 'not-allowed' : 'pointer',
                  background: 'linear-gradient(90deg, #f0a500, #e8187a)', color: '#fff',
                  fontWeight: 700, fontSize: '14px', opacity: buying === draw.id ? 0.7 : 1,
                }}>
                  {buying === draw.id ? 'Buying...' : `Buy · ${formatCurrency(draw.ticket_price * (qty[draw.id] || 1))}`}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  )
}
