import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { Deposit, Draw, User, Settings } from '../types'
import { formatCurrency, formatDate } from '../lib/utils'

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

type Tab = 'deposits' | 'draws' | 'users' | 'settings'

export default function AdminPage() {
  const [, navigate] = useLocation()
  const token = localStorage.getItem('lw_token')
  const [tab, setTab] = useState<Tab>('deposits')
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [draws, setDraws] = useState<Draw[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [settings, setSettings] = useState<Settings>({ bkash_number: '', nagad_number: '', rocket_number: '', whatsapp_number: '', payment_number: '' })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [newDraw, setNewDraw] = useState({ name: '', jackpot: '', ticket_price: '', max_tickets: '', end_date: '' })

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

  const processDeposit = async (id: string, action: 'approve' | 'reject', reason?: string) => {
    const res = await fetch(`${BASE}/api/admin/deposits/${id}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ action, rejection_reason: reason }),
    })
    if (res.ok) { setMsg(`Deposit ${action}d`); loadAll() }
  }

  const selectWinner = async (drawId: string) => {
    const res = await fetch(`${BASE}/api/draws/${drawId}/select-winner`, { method: 'POST', headers })
    const data = await res.json()
    if (res.ok) { setMsg(`Winner: ${data.winner?.ticket_ref}`); loadAll() }
    else setMsg(data.error)
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

  return (
    <div style={{ minHeight: '100vh', background: '#08071a', padding: '0 0 40px' }}>
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
            <h3 style={{ color: '#fff', fontWeight: 700, marginBottom: '14px', fontFamily: 'Poppins, sans-serif' }}>Pending Deposits ({deposits.filter(d => d.status === 'pending').length})</h3>
            {deposits.map(dep => (
              <div key={dep.id} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div>
                    <p style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>{dep.user?.full_name || '—'} · {dep.user?.phone}</p>
                    <p style={{ color: '#8888aa', fontSize: '12px' }}>via {dep.method} · {formatDate(dep.created_at)}</p>
                    <p style={{ color: '#8888aa', fontSize: '12px' }}>TRX: {dep.trx_id} · From: {dep.sender_phone}</p>
                    {dep.fraud_score > 0 && <p style={{ color: dep.fraud_score >= 70 ? '#f88' : '#f0a500', fontSize: '12px' }}>⚠️ Fraud score: {dep.fraud_score} · {dep.fraud_flags.join(', ')}</p>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: '#f0a500', fontWeight: 800, fontSize: '18px' }}>{formatCurrency(dep.amount)}</p>
                    <span style={{ fontSize: '12px', color: dep.status === 'approved' ? '#4f4' : dep.status === 'rejected' ? '#f88' : '#f0a500', fontWeight: 600 }}>{dep.status.toUpperCase()}</span>
                  </div>
                </div>
                {dep.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => processDeposit(dep.id, 'approve')} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'rgba(80,200,80,0.2)', color: '#4f4', fontWeight: 700, fontSize: '13px' }}>✅ Approve</button>
                    <button onClick={() => { const r = prompt('Rejection reason:'); if (r !== null) processDeposit(dep.id, 'reject', r) }} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'rgba(232,24,122,0.2)', color: '#e8187a', fontWeight: 700, fontSize: '13px' }}>❌ Reject</button>
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
                  { label: 'Jackpot (৳)', key: 'jackpot', type: 'number', placeholder: '100000' },
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
                    <p style={{ color: '#8888aa', fontSize: '12px' }}>Jackpot: {formatCurrency(draw.jackpot)} · {draw.tickets_sold}/{draw.max_tickets} tickets</p>
                  </div>
                  <span style={{ color: draw.status === 'live' ? '#e8187a' : draw.status === 'upcoming' ? '#9b20d8' : '#8888aa', fontWeight: 700, fontSize: '12px' }}>{draw.status.toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {draw.status === 'upcoming' && <button onClick={() => updateDraw(draw.id, { status: 'live' })} style={{ padding: '7px 12px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: 'rgba(232,24,122,0.2)', color: '#e8187a', fontWeight: 600, fontSize: '12px' }}>▶ Go Live</button>}
                  {draw.status === 'live' && <button onClick={() => selectWinner(draw.id)} style={{ padding: '7px 12px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: 'rgba(240,165,0,0.2)', color: '#f0a500', fontWeight: 600, fontSize: '12px' }}>🏆 Select Winner</button>}
                  {draw.winner_name && <p style={{ color: '#4f4', fontSize: '12px', alignSelf: 'center' }}>Winner: {draw.winner_name} ({draw.winner_ticket})</p>}
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
            <h3 style={{ color: '#fff', fontWeight: 700, marginBottom: '16px', fontFamily: 'Poppins, sans-serif' }}>Payment Numbers</h3>
            <form onSubmit={saveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
