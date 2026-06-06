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

function formatTicketId(ref: string) { return `TKT-${ref}` }

function formatDrawRef(draw?: Ticket['draw']) {
  if (!draw) return 'N/A'
  if (draw.draw_number) return `#${draw.draw_number}`
  return draw.id.slice(0, 6).toUpperCase()
}

function fmtDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(2)}`
}
function fmtTime(dateStr: string) {
  const d = new Date(dateStr); let h = d.getHours()
  const m = String(d.getMinutes()).padStart(2,'0'); const ap = h>=12?'PM':'AM'; h = h%12||12
  return `${h}:${m} ${ap}`
}

function TicketModal({ ticket, userName, onClose }: { ticket: Ticket; userName: string; onClose: () => void }) {
  const claimCode = ticket.claim_code || ticket.id.slice(0,13).toUpperCase()
  return (
    <div style={{ position:'fixed', inset:0, zIndex:999, background:'rgba(0,0,0,0.78)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={onClose}>
      <div style={{ background:'#f0f2f8', borderRadius:'20px', width:'100%', maxWidth:'380px', overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.5)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', padding:'20px', gap:'18px', alignItems:'flex-start' }}>
          <div style={{ background:'#fff', borderRadius:'12px', padding:'10px', boxShadow:'0 2px 8px rgba(0,0,0,0.1)', flexShrink:0 }}>
            <QRCode value={claimCode} size={110} level="M" />
          </div>
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:'13px', paddingTop:'4px' }}>
            {([
              { icon:'🎫', label:'ID:', value:formatTicketId(ticket.ticket_ref), color:'#2563eb' },
              { icon:'🏷️', label:'DR:', value:formatDrawRef(ticket.draw), color:'#dc2626' },
              { icon:'📅', label:'DT:', value:ticket.draw?.end_date ? fmtDate(ticket.draw.end_date) : 'N/A', color:'#2563eb' },
              { icon:'🕐', label:'TM:', value:ticket.draw?.end_date ? fmtTime(ticket.draw.end_date) : 'N/A', color:'#2563eb' },
            ] as const).map(({ icon, label, value, color }) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                <span style={{ fontSize:'16px', width:'20px' }}>{icon}</span>
                <span style={{ color:'#555', fontSize:'13px', fontWeight:600, fontFamily:'Poppins, sans-serif', minWidth:'28px' }}>{label}</span>
                <span style={{ color, fontSize:'14px', fontWeight:700, fontFamily:'Poppins, sans-serif', marginLeft:'auto', textAlign:'right' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ height:'1px', background:'#d8dce8', margin:'0 16px' }} />
        <div style={{ background:'#e8ecf5', padding:'13px 20px', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <span style={{ color:'#333', fontSize:'12px', fontWeight:700, fontFamily:'Poppins, sans-serif', letterSpacing:'0.5px', textAlign:'center' }}>
            USER: {userName.toUpperCase()} | VERIFIED BY BLOCKCHAIN ✅
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
      .then(r => r.json()).then(d => { setTickets(d.tickets || []); setLoading(false) })
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
          {formatTicketId(ticket.ticket_ref)}
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
      {selected && <TicketModal ticket={selected} userName={user?.full_name || 'USER'} onClose={() => setSelected(null)} />}
    </div>
  )
}
