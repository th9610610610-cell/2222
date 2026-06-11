import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { useAuth } from '../lib/auth'
import TopNav from '../components/TopNav'
import BottomNav from '../components/BottomNav'
import { Ticket } from '../types'
import { formatDate } from '../lib/utils'
import QRCode from 'react-qr-code'

import { API_BASE } from '../lib/apiBase'
const BASE = API_BASE

function fmtDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(2)}`
}
function fmtTime(dateStr: string) {
  const d = new Date(dateStr); let h = d.getHours()
  const m = String(d.getMinutes()).padStart(2,'0'); const ap = h>=12?'PM':'AM'; h = h%12||12
  return `${h}:${m} ${ap}`
}
function ticketId(ref: string) { return `ID-${ref}` }
function drawId(draw?: Ticket['draw']) {
  if (!draw) return 'N/A'
  const raw = draw.id.replace(/-/g,'').slice(0,5).toUpperCase()
  return `ID-${raw}`
}

const ROW_ITEMS = [
  { icon: '🎫', label: 'TK', getValue: (t: Ticket) => ticketId(t.ticket_ref) },
  { icon: '💰', label: 'DR', getValue: (t: Ticket) => drawId(t.draw) },
  { icon: '⏳', label: 'TM', getValue: (t: Ticket) => t.created_at ? fmtTime(t.created_at) : 'N/A' },
  { icon: '🗓️', label: 'DT', getValue: (t: Ticket) => t.created_at ? fmtDate(t.created_at) : 'N/A' },
]

function TicketModal({ ticket: initialTicket, userName, token, onClose }: {
  ticket: Ticket; userName: string; token: string | null; onClose: () => void
}) {
  const [ticket, setTicket] = useState<Ticket>(initialTicket)

  useEffect(() => {
    if (!token) return
    fetch(`${BASE}/api/tickets`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const updated = (d.tickets || []).find((t: Ticket) => t.id === initialTicket.id)
        if (updated) setTicket(updated)
      })
      .catch(() => {})
  }, [token, initialTicket.id])

  const statusColor = ticket.draw?.status === 'live' ? '#16a34a'
    : ticket.draw?.status === 'ended' ? '#dc2626' : '#2563eb'
  const stripBg = ticket.draw?.status === 'live'
    ? 'linear-gradient(90deg,#16a34a,#22c55e)'
    : ticket.draw?.status === 'ended'
      ? 'linear-gradient(90deg,#dc2626,#ef4444)'
      : 'linear-gradient(90deg,#2563eb,#3b82f6)'

  return (
    <div
      style={{ position:'fixed', inset:0, zIndex:999, background:'rgba(0,0,0,0.78)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}
      onClick={onClose}
    >
      <div
        style={{ width:'90%', borderRadius:'16px', overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.5)', background:'#f0f2f8' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Status strip */}
        <div style={{ background: stripBg, padding:'5px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ color:'#fff', fontSize:'11px', fontWeight:700, fontFamily:'Poppins, sans-serif', letterSpacing:'0.5px' }}>
            {ticket.is_winner ? '🏆 WINNING TICKET' : `● ${(ticket.draw?.status || 'N/A').toUpperCase()}`}
          </span>
          <span style={{ color:'rgba(255,255,255,0.85)', fontSize:'10px', fontFamily:'Poppins, sans-serif', fontWeight:600 }}>
            {ticket.created_at ? `${fmtDate(ticket.created_at)} · ${fmtTime(ticket.created_at)}` : ''}
          </span>
        </div>

        {/* Card body */}
        <div style={{ height:'148px', display:'flex', padding:'16px', gap:'16px', alignItems:'stretch', boxSizing:'border-box' }}>
          {/* QR Code 88×88 */}
          <div style={{ flexShrink:0, display:'flex', alignItems:'center' }}>
            <div style={{ background:'#fff', borderRadius:'10px', padding:'6px', boxShadow:'0 2px 8px rgba(0,0,0,0.1)' }}>
              <QRCode
                value={[
                  `TKT:${ticket.ticket_ref}`,
                  `DRAW:${ticket.draw?.name || 'N/A'}`,
                  `USER:${userName.toUpperCase()}`,
                  ticket.is_winner ? 'WINNER:YES' : 'WINNER:NO',
                ].join('|')}
                size={88}
                level="M"
              />
            </div>
          </div>

          {/* Info rows */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:'4px', justifyContent:'center' }}>
            {ROW_ITEMS.map(({ icon, label, getValue }) => (
              <div key={label} style={{
                height:'25px', borderRadius:'8px', padding:'0 8px',
                background:'rgba(0,0,0,0.06)',
                display:'flex', alignItems:'center', gap:'5px', flexShrink:0,
              }}>
                <span style={{ fontSize:'12px', width:'14px', height:'14px', lineHeight:'14px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{icon}</span>
                <span style={{ fontSize:'10px', fontWeight:600, color:'#444', fontFamily:'Poppins, sans-serif', minWidth:'18px' }}>{label}:</span>
                <span style={{
                  fontSize:'10px', fontWeight:700, color: label === 'TK' ? '#2563eb' : label === 'DR' ? '#dc2626' : '#1a1a2e',
                  fontFamily:'Poppins, sans-serif', marginLeft:'auto', textAlign:'right',
                  letterSpacing: (label === 'TK' || label === 'DR') ? '0.3px' : 0,
                }}>
                  {getValue(ticket)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ background:'#e8ecf5', padding:'9px 20px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
          <span style={{ width:'7px', height:'7px', borderRadius:'50%', background: statusColor, display:'inline-block', flexShrink:0 }} />
          <span style={{ color:'#333', fontSize:'11px', fontWeight:700, fontFamily:'Poppins, sans-serif', letterSpacing:'0.5px', textAlign:'center' }}>
            USER: {userName.toUpperCase()} | VERIFIED ✅
          </span>
        </div>
      </div>
      <p style={{ position:'absolute', bottom:'28px', color:'rgba(255,255,255,0.45)', fontSize:'13px', fontFamily:'Poppins, sans-serif' }}>Tap outside to close</p>
    </div>
  )
}

export default function MyTicketsPage() {
  const [, navigate] = useLocation()
  const { token, user } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Ticket | null>(null)

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    fetch(`${BASE}/api/tickets`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setTickets(d.tickets || [])).catch(() => {}).finally(() => setLoading(false))
  }, [token])

  const winners = tickets.filter(t => t.is_winner)
  const active  = tickets.filter(t => !t.is_winner && t.draw?.status !== 'ended')
  const expired = tickets.filter(t => !t.is_winner && t.draw?.status === 'ended')

  const TicketCard = ({ ticket }: { ticket: Ticket }) => (
    <div onClick={() => setSelected(ticket)} style={{
      background: ticket.is_winner ? 'linear-gradient(135deg,rgba(240,165,0,0.12),rgba(232,24,122,0.12))' : '#100f28',
      borderRadius:'14px', border:`1px solid ${ticket.is_winner?'rgba(240,165,0,0.5)':'rgba(155,32,216,0.2)'}`,
      padding:'16px', marginBottom:'10px', cursor:'pointer',
    }}>
      {ticket.is_winner && (
        <div style={{ background:'linear-gradient(90deg,rgba(240,165,0,0.2),rgba(232,24,122,0.2))', borderRadius:'8px', padding:'8px 12px', marginBottom:'10px', display:'flex', alignItems:'center', gap:'8px' }}>
          <span style={{ fontSize:'18px' }}>🏆</span>
          <span style={{ color:'#f0a500', fontWeight:700, fontSize:'13px', fontFamily:'Poppins,sans-serif' }}>WINNER!</span>
        </div>
      )}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
        <span style={{ fontFamily:'monospace', color:'#f0a500', fontWeight:700, fontSize:'15px', letterSpacing:'3px' }}>
          TKT-{ticket.ticket_ref}
        </span>
        <span style={{ fontSize:'12px', color:'#8888aa', fontFamily:'Poppins,sans-serif' }}>{formatDate(ticket.created_at)}</span>
      </div>
      {ticket.draw && (
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ color:'#ccc', fontSize:'13px', fontFamily:'Poppins,sans-serif' }}>{ticket.draw.name}</span>
          <span style={{ color:'#9b20d8', fontSize:'11px', fontWeight:600, fontFamily:'Poppins,sans-serif', background:'rgba(155,32,216,0.1)', padding:'2px 8px', borderRadius:'6px' }}>{ticket.draw.status?.toUpperCase()}</span>
        </div>
      )}
      <p style={{ color:'#6060a0', fontSize:'11px', marginTop:'6px', fontFamily:'Poppins,sans-serif' }}>Tap to view QR &amp; details</p>
    </div>
  )

  return (
    <div className="app">
      <TopNav />
      <div style={{ padding:'18px 18px 100px' }}>
        <h2 style={{ fontFamily:'Poppins,sans-serif', fontSize:'20px', fontWeight:800, color:'#fff', marginBottom:'18px' }}>🎫 My Tickets</h2>

        {loading ? (
          <p style={{ color:'#8888aa', textAlign:'center', marginTop:'40px' }}>Loading tickets...</p>
        ) : tickets.length === 0 ? (
          <div style={{ textAlign:'center', marginTop:'60px' }}>
            <div style={{ fontSize:'48px', marginBottom:'16px' }}>🎟️</div>
            <p style={{ color:'#8888aa', fontSize:'15px', marginBottom:'16px', fontFamily:'Poppins,sans-serif' }}>No tickets yet</p>
            <button onClick={() => navigate('/draws')} style={{ padding:'12px 28px', borderRadius:'12px', border:'none', cursor:'pointer', background:'linear-gradient(90deg,#f0a500,#e8187a)', color:'#fff', fontWeight:700, fontFamily:'Poppins,sans-serif' }}>Browse Draws</button>
          </div>
        ) : (
          <>
            {winners.length > 0 && <>
              <h3 style={{ color:'#f0a500', fontWeight:700, fontSize:'14px', marginBottom:'10px', textTransform:'uppercase', letterSpacing:'1px', fontFamily:'Poppins,sans-serif' }}>🏆 Winning Tickets</h3>
              {winners.map(t => <TicketCard key={t.id} ticket={t} />)}
            </>}
            {active.length > 0 && <>
              <h3 style={{ color:'#9b20d8', fontWeight:700, fontSize:'14px', marginBottom:'10px', marginTop:winners.length>0?'20px':0, textTransform:'uppercase', letterSpacing:'1px', fontFamily:'Poppins,sans-serif' }}>Active Tickets</h3>
              {active.map(t => <TicketCard key={t.id} ticket={t} />)}
            </>}
            {expired.length > 0 && <>
              <h3 style={{ color:'#8888aa', fontWeight:700, fontSize:'14px', marginBottom:'10px', marginTop:'20px', textTransform:'uppercase', letterSpacing:'1px', fontFamily:'Poppins,sans-serif' }}>Past Tickets</h3>
              {expired.map(t => <TicketCard key={t.id} ticket={t} />)}
            </>}
          </>
        )}
      </div>
      <BottomNav />
      {selected && <TicketModal ticket={selected} userName={user?.full_name || 'USER'} token={token} onClose={() => setSelected(null)} />}
    </div>
  )
}
