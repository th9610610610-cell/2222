import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { useAuth } from '../lib/auth'
import TopNav from '../components/TopNav'
import BottomNav from '../components/BottomNav'
import { Ticket } from '../types'
import { formatDate, formatCurrency } from '../lib/utils'

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

export default function MyTicketsPage() {
  const [, navigate] = useLocation()
  const { token } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    fetch(`${BASE}/api/tickets`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { setTickets(d.tickets || []); setLoading(false) })
  }, [token])

  const winners = tickets.filter(t => t.is_winner)
  const active = tickets.filter(t => !t.is_winner && t.draw?.status !== 'ended')
  const expired = tickets.filter(t => !t.is_winner && t.draw?.status === 'ended')

  const cardStyle: React.CSSProperties = { background: '#100f28', borderRadius: '14px', border: '1px solid rgba(155,32,216,0.2)', padding: '16px', marginBottom: '10px' }

  const TicketCard = ({ ticket }: { ticket: Ticket }) => (
    <div style={{ ...cardStyle, borderColor: ticket.is_winner ? 'rgba(240,165,0,0.5)' : 'rgba(155,32,216,0.2)' }}>
      {ticket.is_winner && (
        <div style={{ background: 'linear-gradient(90deg, rgba(240,165,0,0.2), rgba(232,24,122,0.2))', borderRadius: '8px', padding: '8px 12px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🏆</span>
          <span style={{ color: '#f0a500', fontWeight: 700, fontSize: '13px' }}>WINNER!</span>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontFamily: 'monospace', color: '#f0a500', fontWeight: 700, fontSize: '15px', letterSpacing: '2px' }}>{ticket.ticket_ref}</span>
        <span style={{ fontSize: '12px', color: '#8888aa' }}>{formatDate(ticket.created_at)}</span>
      </div>
      {ticket.draw && (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#ccc', fontSize: '13px' }}>{ticket.draw.name}</span>
          <span style={{ color: '#9b20d8', fontSize: '12px', fontWeight: 600 }}>{ticket.draw.status?.toUpperCase()}</span>
        </div>
      )}
    </div>
  )

  return (
    <div className="app">
      <TopNav />
      <div style={{ padding: '18px 18px 100px' }}>
        <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '18px' }}>🎫 My Tickets</h2>

        {loading ? (
          <p style={{ color: '#8888aa', textAlign: 'center', marginTop: '40px' }}>Loading tickets...</p>
        ) : tickets.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '60px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎟️</div>
            <p style={{ color: '#8888aa', fontSize: '15px', marginBottom: '16px' }}>No tickets yet</p>
            <button onClick={() => navigate('/draws')} style={{ padding: '12px 28px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: 'linear-gradient(90deg, #f0a500, #e8187a)', color: '#fff', fontWeight: 700 }}>Browse Draws</button>
          </div>
        ) : (
          <>
            {winners.length > 0 && (
              <>
                <h3 style={{ color: '#f0a500', fontWeight: 700, fontSize: '14px', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>🏆 Winning Tickets</h3>
                {winners.map(t => <TicketCard key={t.id} ticket={t} />)}
              </>
            )}
            {active.length > 0 && (
              <>
                <h3 style={{ color: '#9b20d8', fontWeight: 700, fontSize: '14px', marginBottom: '10px', marginTop: winners.length > 0 ? '20px' : 0, textTransform: 'uppercase', letterSpacing: '1px' }}>Active Tickets</h3>
                {active.map(t => <TicketCard key={t.id} ticket={t} />)}
              </>
            )}
            {expired.length > 0 && (
              <>
                <h3 style={{ color: '#8888aa', fontWeight: 700, fontSize: '14px', marginBottom: '10px', marginTop: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>Past Tickets</h3>
                {expired.map(t => <TicketCard key={t.id} ticket={t} />)}
              </>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
