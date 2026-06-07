import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { Deposit, Draw, User, Settings } from '../types'
import { formatCurrency, formatDate, formatJackpot } from '../lib/utils'

import { API_BASE } from '../lib/apiBase'
const BASE = API_BASE

type Tab = 'deposits' | 'draws' | 'users' | 'settings'

const REJECT_REASONS = [
  'Invalid Transaction Id',
  'Duplicate Transaction',
  'Amount Mismatch',
]

export default function AdminPage() {
  const [, navigate] = useLocation()
  const token = localStorage.getItem('lw_token')
  const [tab, setTab] = useState<Tab>('deposits')
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [draws, setDraws] = useState<Draw[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [settings, setSettings] = useState<Settings>({ bkash_number: '', nagad_number: '', rocket_number: '', whatsapp_number: '', payment_number: '', announcement: '' })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [newDraw, setNewDraw] = useState({ name: '', jackpot: '', ticket_price: '', max_tickets: '', end_date: '' })

  // Rejection modal state
  const [rejectModal, setRejectModal] = useState<{ depositId: string } | null>(null)

  // Reschedule modal state
  const [rescheduleModal, setRescheduleModal] = useState<{ drawId: string; drawName: string } | null>(null)
  const [newEndDate, setNewEndDate] = useState('')

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  useEffect(() => {
    if (!token) { navigate('/lw-secure-7x9k'); return }
    loadAll()
  }, [token])

  const loadAll = async () => {
    setLoading(true)
    const [d, dr, u, s] = await Promise.all([
      fetch(`${BASE}/api/admin/deposits`, { headers }).then(r => r.json()),
      fetch(`${BASE}/api/draws`).then(r => r.json()),
      fetch(`${BASE}/api/admin/users`, { headers }).then(r => r.json()),
      fetch(`${BASE}/api/settings`).then(r => r.json()),
    ])
    setDeposits(d.deposits || [])
    setDraws(dr.draws || [])
    setUsers(u.users || [])
    if (s.settings) setSettings(s.settings)
    setLoading(false)
  }

  // Sort: pending first (oldest at top = FIFO), then non-pending (newest at top)
  const sortedDeposits = [...deposits].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1
    if (a.status !== 'pending' && b.status === 'pending') return 1
    if (a.status === 'pending' && b.status === 'pending') {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const processDeposit = async (id: string, action: 'approve' | 'reject', reason?: string) => {
    const res = await fetch(`${BASE}/api/admin/deposits/${id}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ action, rejection_reason: reason }),
    })
    if (res.ok) { setMsg(`Deposit ${action}d`); loadAll() }
    setRejectModal(null)
  }

  const selectWinner = async (drawId: string) => {
    const res = await fetch(`${BASE}/api/draws/${drawId}/select-winner`, { method: 'POST', headers })
    const data = await res.json()
    if (res.ok) { setMsg(`Winner: ${data.winner?.ticket_ref}`); loadAll() }
    else setMsg(data.error)
  }

  const deleteDraw = async (drawId: string, drawName: string) => {
    if (!confirm(`Delete draw "${drawName}"? This will also delete all tickets.`)) return
    const res = await fetch(`${BASE}/api/draws/${drawId}`, { method: 'DELETE', headers })
    if (res.ok) { setMsg(`Draw "${drawName}" deleted`); loadAll() }
  }

  const createDraw = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch(`${BASE}/api/draws`, {
      method: 'POST', headers,
      body: JSON.stringify({ ...newDraw, jackpot: Number(newDraw.jackpot), ticket_price: Number(newDraw.ticket_price), max_tickets: Number(newDraw.max_tickets) }),
    })
    if (res.ok) { setMsg('Draw created'); setNewDraw({ name: '', jackpot: '', ticket_price: '', max_tickets: '', end_date: '' }); loadAll() }
  }

  const updateDraw = async (id: string, updates: Partial<Draw>) => {
    await fetch(`${BASE}/api/draws/${id}`, { method: 'PATCH', headers, body: JSON.stringify(updates) })
    loadAll()
  }

  const rescheduleDraw = async () => {
    if (!rescheduleModal || !newEndDate) return
    await fetch(`${BASE}/api/draws/${rescheduleModal.drawId}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ status: 'rescheduled', end_date: newEndDate }),
    })
    setMsg(`Draw rescheduled`)
    setRescheduleModal(null)
    setNewEndDate('')
    loadAll()
  }

  const updateUser = async (id: string, updates: any) => {
    await fetch(`${BASE}/api/admin/users/${id}`, { method: 'PATCH', headers, body: JSON.stringify(updates) })
    loadAll()
  }

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch(`${BASE}/api/settings`, { method: 'POST', headers, body: JSON.stringify(settings) })
    if (res.ok) setMsg('Settings saved')
  }

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: '10px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer',
    background: tab === t ? 'linear-gradient(90deg, #e8187a, #9b20d8)' : 'rgba(155,32,216,0.1)',
    color: '#fff', fontWeight: 600, fontSize: '13px',
  })
  const inputStyle: React.CSSProperties = { background: '#08071a', border: '1px solid rgba(155,32,216,0.3)', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' }
  const cardStyle: React.CSSProperties = { background: '#100f28', borderRadius: '14px', border: '1px solid rgba(155,32,216,0.2)', padding: '16px', marginBottom: '10px' }

  const statusColor = (s: string) => {
    if (s === 'live') return '#e8187a'
    if (s === 'upcoming') return '#9b20d8'
    if (s === 'rescheduled') return '#f0a500'
    if (s === 'ended') return '#8888aa'
    return '#8888aa'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#08071a', padding: '0 0 40px' }}>

      {/* Rejection Reason Modal */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#100f28', borderRadius: '18px', border: '1px solid rgba(232,24,122,0.4)', padding: '24px', width: '100%', maxWidth: '340px' }}>
            <h3 style={{ color: '#fff', fontWeight: 700, fontFamily: 'Poppins, sans-serif', marginBottom: '6px' }}>❌ Reject Deposit</h3>
            <p style={{ color: '#8888aa', fontSize: '13px', marginBottom: '18px' }}>Select a reason for rejection:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
              {REJECT_REASONS.map((reason, i) => (
                <button key={i} onClick={() => processDeposit(rejectModal.depositId, 'reject', reason)}
                  style={{ padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(232,24,122,0.3)', background: 'rgba(232,24,122,0.08)', color: '#fff', textAlign: 'left', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>
                  <span style={{ color: '#e8187a', fontWeight: 700 }}>{i + 1}.</span> {reason}
                </button>
              ))}
            </div>
            <button onClick={() => setRejectModal(null)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#aaa', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#100f28', borderRadius: '18px', border: '1px solid rgba(240,165,0,0.4)', padding: '24px', width: '100%', maxWidth: '340px' }}>
            <h3 style={{ color: '#fff', fontWeight: 700, fontFamily: 'Poppins, sans-serif', marginBottom: '6px' }}>🔄 Reschedule Draw</h3>
            <p style={{ color: '#8888aa', fontSize: '13px', marginBottom: '16px' }}>{rescheduleModal.drawName}</p>
            <label style={{ color: '#aaa', fontSize: '12px', marginBottom: '6px', display: 'block' }}>New End Date</label>
            <input type="datetime-local" value={newEndDate} onChange={e => setNewEndDate(e.target.value)} style={{ ...inputStyle, marginBottom: '16px' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={rescheduleDraw} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'rgba(240,165,0,0.2)', color: '#f0a500', fontWeight: 700, fontSize: '13px' }}>🔄 Reschedule</button>
              <button onClick={() => { setRescheduleModal(null); setNewEndDate('') }} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#aaa', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: '#0e0c24', borderBottom: '1px solid rgba(155,32,216,0.3)', padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#f0a500', fontSize: '20px' }}>♛</span>
          <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#fff', fontSize: '16px' }}>Admin Panel</span>
        </div>
        <button onClick={() => navigate('/')} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(155,32,216,0.3)', background: 'transparent', color: '#aaa', cursor: 'pointer', fontSize: '13px' }}>← App</button>
      </div>

      <div style={{ padding: '18px' }}>
        {msg && <div style={{ background: 'rgba(80,200,80,0.15)', border: '1px solid rgba(80,200,80,0.4)', borderRadius: '8px', padding: '10px 14px', color: '#4f4', fontSize: '13px', marginBottom: '16px' }}>{msg} <span onClick={() => setMsg('')} style={{ float: 'right', cursor: 'pointer' }}>✕</span></div>}

        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {(['deposits', 'draws', 'users', 'settings'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={tabStyle(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </div>

        {loading && <p style={{ color: '#8888aa', textAlign: 'center' }}>Loading...</p>}

        {/* DEPOSITS TAB */}
        {tab === 'deposits' && !loading && (
          <>
            <h3 style={{ color: '#fff', fontWeight: 700, marginBottom: '14px', fontFamily: 'Poppins, sans-serif' }}>
              Deposits · <span style={{ color: '#f0a500' }}>{sortedDeposits.filter(d => d.status === 'pending').length} Pending</span>
            </h3>
            {sortedDeposits.map(dep => (
              <div key={dep.id} style={{ ...cardStyle, borderColor: dep.status === 'pending' ? 'rgba(240,165,0,0.35)' : 'rgba(155,32,216,0.15)', opacity: dep.status !== 'pending' ? 0.7 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div>
                    <p style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>{dep.user?.full_name || '—'} · {dep.user?.phone}</p>
                    <p style={{ color: '#8888aa', fontSize: '12px' }}>via {dep.method} · {formatDate(dep.created_at)}</p>
                    <p style={{ color: '#8888aa', fontSize: '12px' }}>TRX: {dep.trx_id} · From: {dep.sender_phone}</p>
                    {dep.fraud_score > 0 && <p style={{ color: dep.fraud_score >= 70 ? '#f88' : '#f0a500', fontSize: '12px' }}>⚠️ Fraud score: {dep.fraud_score} · {dep.fraud_flags.join(', ')}</p>}
                    {dep.rejection_reason && <p style={{ color: '#f88', fontSize: '12px', marginTop: '4px' }}>Reason: {dep.rejection_reason}</p>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: '#f0a500', fontWeight: 800, fontSize: '18px' }}>{formatCurrency(dep.amount)}</p>
                    <span style={{ fontSize: '12px', color: dep.status === 'approved' ? '#4f4' : dep.status === 'rejected' ? '#f88' : '#f0a500', fontWeight: 600 }}>{dep.status.toUpperCase()}</span>
                  </div>
                </div>
                {dep.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => processDeposit(dep.id, 'approve')} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'rgba(80,200,80,0.2)', color: '#4f4', fontWeight: 700, fontSize: '13px' }}>✅ Approve</button>
                    <button onClick={() => setRejectModal({ depositId: dep.id })} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'rgba(232,24,122,0.2)', color: '#e8187a', fontWeight: 700, fontSize: '13px' }}>❌ Reject</button>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* DRAWS TAB */}
        {tab === 'draws' && !loading && (
          <>
            <div style={cardStyle}>
              <h3 style={{ color: '#fff', fontWeight: 700, marginBottom: '14px', fontFamily: 'Poppins, sans-serif' }}>Create Draw</h3>
              <form onSubmit={createDraw} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { label: 'Draw Name', key: 'name', type: 'text', placeholder: 'e.g. Weekly Mega Draw' },
                  { label: 'Jackpot (৳)', key: 'jackpot', type: 'number', placeholder: '1000000' },
                  { label: 'Ticket Price (৳)', key: 'ticket_price', type: 'number', placeholder: '50' },
                  { label: 'Max Tickets', key: 'max_tickets', type: 'number', placeholder: '1000' },
                ].map(({ label, key, type, placeholder }) => (
                  <div key={key}>
                    <label style={{ color: '#aaa', fontSize: '12px', marginBottom: '4px', display: 'block' }}>{label}</label>
                    <input type={type} value={(newDraw as any)[key]} onChange={e => setNewDraw(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} required style={inputStyle} />
                  </div>
                ))}
                <div>
                  <label style={{ color: '#aaa', fontSize: '12px', marginBottom: '4px', display: 'block' }}>End Date</label>
                  <input type="datetime-local" value={newDraw.end_date} onChange={e => setNewDraw(f => ({ ...f, end_date: e.target.value }))} required style={inputStyle} />
                </div>
                <button type="submit" style={{ padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'linear-gradient(90deg, #f0a500, #e8187a)', color: '#fff', fontWeight: 700 }}>Create Draw</button>
              </form>
            </div>
            {draws.map(draw => (
              <div key={draw.id} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <p style={{ color: '#fff', fontWeight: 600, fontSize: '15px' }}>{draw.name}</p>
                    <p style={{ color: '#8888aa', fontSize: '12px' }}>Jackpot: {formatJackpot(draw.jackpot)} · {draw.tickets_sold}/{draw.max_tickets} tickets</p>
                  </div>
                  <span style={{ color: statusColor(draw.status), fontWeight: 700, fontSize: '12px' }}>{draw.status.toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {draw.status === 'upcoming' && (
                    <button onClick={() => updateDraw(draw.id, { status: 'live' })} style={{ padding: '7px 12px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: 'rgba(232,24,122,0.2)', color: '#e8187a', fontWeight: 600, fontSize: '12px' }}>▶ Go Live</button>
                  )}
                  {draw.status === 'live' && (
                    <button onClick={() => selectWinner(draw.id)} style={{ padding: '7px 12px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: 'rgba(240,165,0,0.2)', color: '#f0a500', fontWeight: 600, fontSize: '12px' }}>🏆 Select Winner</button>
                  )}
                  {(draw.status === 'upcoming' || draw.status === 'live') && (
                    <button onClick={() => setRescheduleModal({ drawId: draw.id, drawName: draw.name })} style={{ padding: '7px 12px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: 'rgba(240,165,0,0.15)', color: '#f0a500', fontWeight: 600, fontSize: '12px' }}>🔄 Reschedule</button>
                  )}
                  {draw.status === 'rescheduled' && (
                    <button onClick={() => updateDraw(draw.id, { status: 'upcoming' })} style={{ padding: '7px 12px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: 'rgba(155,32,216,0.2)', color: '#9b20d8', fontWeight: 600, fontSize: '12px' }}>📅 Set Upcoming</button>
                  )}
                  {draw.winner_name && <p style={{ color: '#4f4', fontSize: '12px', alignSelf: 'center' }}>Winner: {draw.winner_name} ({draw.winner_ticket})</p>}
                  <button onClick={() => deleteDraw(draw.id, draw.name)} style={{ padding: '7px 12px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: 'rgba(232,24,122,0.12)', color: '#e8187a', fontWeight: 600, fontSize: '12px', marginLeft: 'auto' }}>🗑 Delete</button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* USERS TAB */}
        {tab === 'users' && !loading && (
          <>
            <h3 style={{ color: '#fff', fontWeight: 700, marginBottom: '14px', fontFamily: 'Poppins, sans-serif' }}>All Users ({users.length})</h3>
            {users.map(u => (
              <div key={u.id} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <p style={{ color: '#fff', fontWeight: 600 }}>{u.full_name}</p>
                    <p style={{ color: '#8888aa', fontSize: '12px' }}>{u.phone} · {u.role}</p>
                    <p style={{ color: '#8888aa', fontSize: '12px' }}>Balance: {formatCurrency(u.balance)} · Won: {formatCurrency(u.total_won)}</p>
                  </div>
                  {u.is_flagged && <span style={{ color: '#e8187a', fontSize: '12px', fontWeight: 700 }}>⚠️ FLAGGED</span>}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {u.is_flagged && <button onClick={() => updateUser(u.id, { is_flagged: false })} style={{ padding: '6px 10px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: 'rgba(80,200,80,0.2)', color: '#4f4', fontSize: '12px', fontWeight: 600 }}>Clear Flag</button>}
                  {!u.is_flagged && <button onClick={() => updateUser(u.id, { is_flagged: true })} style={{ padding: '6px 10px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: 'rgba(232,24,122,0.2)', color: '#e8187a', fontSize: '12px', fontWeight: 600 }}>Flag</button>}
                  {u.role === 'user' && <button onClick={() => updateUser(u.id, { role: 'moderator' })} style={{ padding: '6px 10px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: 'rgba(155,32,216,0.2)', color: '#9b20d8', fontSize: '12px', fontWeight: 600 }}>→ Mod</button>}
                  {u.role === 'moderator' && <button onClick={() => updateUser(u.id, { role: 'user' })} style={{ padding: '6px 10px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: 'rgba(155,32,216,0.1)', color: '#8888aa', fontSize: '12px', fontWeight: 600 }}>→ User</button>}
                </div>
              </div>
            ))}
          </>
        )}

        {/* SETTINGS TAB */}
        {tab === 'settings' && (
          <div style={cardStyle}>
            <h3 style={{ color: '#fff', fontWeight: 700, marginBottom: '16px', fontFamily: 'Poppins, sans-serif' }}>Settings</h3>
            <form onSubmit={saveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Announcement */}
              <div style={{ borderBottom: '1px solid rgba(155,32,216,0.2)', paddingBottom: '16px', marginBottom: '4px' }}>
                <label style={{ color: '#f0a500', fontSize: '13px', marginBottom: '6px', display: 'block', fontWeight: 700 }}>📢 Pinned Announcement</label>
                <textarea
                  value={settings.announcement || ''}
                  onChange={e => setSettings(s => ({ ...s, announcement: e.target.value }))}
                  placeholder="Enter announcement to pin in user notifications (leave empty to remove)"
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                />
                <p style={{ color: '#666', fontSize: '11px', marginTop: '4px' }}>This will appear pinned at the top of every user's notifications.</p>
              </div>

              {/* Payment Numbers */}
              <p style={{ color: '#aaa', fontSize: '13px', fontWeight: 700, margin: '4px 0 8px' }}>💳 Payment Numbers</p>
              {[
                { label: '📱 bKash Number', key: 'bkash_number', placeholder: '01XXXXXXXXX' },
                { label: '💰 Nagad Number', key: 'nagad_number', placeholder: '01XXXXXXXXX' },
                { label: '🚀 Rocket Number', key: 'rocket_number', placeholder: '01XXXXXXXXX' },
                { label: '💳 Payment Number (General)', key: 'payment_number', placeholder: '01XXXXXXXXX' },
                { label: '📲 WhatsApp Number', key: 'whatsapp_number', placeholder: '+8801XXXXXXXXX' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px', display: 'block' }}>{label}</label>
                  <input type="text" value={(settings as any)[key] || ''} onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))} placeholder={placeholder} style={inputStyle} />
                </div>
              ))}
              <button type="submit" style={{ padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'linear-gradient(90deg, #9b20d8, #e8187a)', color: '#fff', fontWeight: 700 }}>Save Settings</button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
