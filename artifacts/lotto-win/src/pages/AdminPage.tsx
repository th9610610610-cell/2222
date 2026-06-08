import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { Deposit, Draw, User, Settings, Ad } from '../types'
import { formatCurrency, formatDate, formatJackpot } from '../lib/utils'

import { API_BASE } from '../lib/apiBase'
const BASE = API_BASE

type Tab = 'deposits' | 'draws' | 'users' | 'settings' | 'ads'

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
  const [ads, setAds] = useState<Ad[]>([])
  const [newAd, setNewAd] = useState({ type: 'text', title: '', content: '', link_url: '' })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [newDraw, setNewDraw] = useState({
    name: '', jackpot: '', ticket_price: '', max_tickets: '', end_date: '',
    background_type: 'natural', background_image_url: '',
  })

  const [rejectModal, setRejectModal] = useState<{ depositId: string } | null>(null)
  const [rescheduleModal, setRescheduleModal] = useState<{ drawId: string; drawName: string } | null>(null)
  const [newEndDate, setNewEndDate] = useState('')

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  useEffect(() => {
    if (!token) { navigate('/lw-secure-7x9k'); return }
    loadAll()
  }, [token])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [d, dr, u, s, a] = await Promise.all([
        fetch(`${BASE}/api/admin/deposits`, { headers }).then(r => r.json()).catch(() => ({})),
        fetch(`${BASE}/api/draws`).then(r => r.json()).catch(() => ({})),
        fetch(`${BASE}/api/admin/users`, { headers }).then(r => r.json()).catch(() => ({})),
        fetch(`${BASE}/api/settings`).then(r => r.json()).catch(() => ({})),
        fetch(`${BASE}/api/ads/all`, { headers }).then(r => r.json()).catch(() => ({})),
      ])
      setDeposits(d.deposits || [])
      setDraws(dr.draws || [])
      setUsers(u.users || [])
      if (s.settings) setSettings(s.settings)
      setAds(a.ads || [])
    } catch (e) {
      console.error('loadAll failed', e)
    } finally {
      setLoading(false)
    }
  }

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
      body: JSON.stringify({
        ...newDraw,
        jackpot: Number(newDraw.jackpot),
        ticket_price: Number(newDraw.ticket_price),
        max_tickets: Number(newDraw.max_tickets),
      }),
    })
    if (res.ok) {
      setMsg('Draw created')
      setNewDraw({ name: '', jackpot: '', ticket_price: '', max_tickets: '', end_date: '', background_type: 'natural', background_image_url: '' })
      loadAll()
    }
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
            <p style={{ color: '#8888aa', fontSize: '13px', marginBottom: '16px' }}>Select a reason:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {REJECT_REASONS.map(r => (
                <button key={r} onClick={() => processDeposit(rejectModal.depositId, 'reject', r)}
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(232,24,122,0.3)', background: 'rgba(232,24,122,0.1)', color: '#e8187a', cursor: 'pointer', fontWeight: 600, fontSize: '13px', textAlign: 'left' }}>
                  {r}
                </button>
              ))}
            </div>
            <button onClick={() => setRejectModal(null)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: 'rgba(136,136,170,0.2)', color: '#aaa', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#100f28', borderRadius: '18px', border: '1px solid rgba(240,165,0,0.4)', padding: '24px', width: '100%', maxWidth: '340px' }}>
            <h3 style={{ color: '#fff', fontWeight: 700, fontFamily: 'Poppins, sans-serif', marginBottom: '6px' }}>🔄 Reschedule: {rescheduleModal.drawName}</h3>
            <p style={{ color: '#8888aa', fontSize: '13px', marginBottom: '14px' }}>New end date:</p>
            <input type="datetime-local" value={newEndDate} onChange={e => setNewEndDate(e.target.value)} style={{ ...inputStyle, marginBottom: '16px' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={rescheduleDraw} disabled={!newEndDate} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: newEndDate ? 'pointer' : 'not-allowed', background: 'linear-gradient(90deg, #f0a500, #e8187a)', color: '#fff', fontWeight: 700, opacity: newEndDate ? 1 : 0.5 }}>Reschedule</button>
              <button onClick={() => { setRescheduleModal(null); setNewEndDate('') }} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: 'rgba(136,136,170,0.2)', color: '#aaa', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h1 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 900, fontSize: '22px', color: '#fff' }}>🔐 Admin Panel</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => navigate('/winner')} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'rgba(240,165,0,0.15)', color: '#f0a500', fontWeight: 600, fontSize: '13px' }}>🏆 Winners</button>
            <button onClick={() => { localStorage.removeItem('lw_token'); navigate('/lw-secure-7x9k') }} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'rgba(232,24,122,0.15)', color: '#e8187a', fontWeight: 600, fontSize: '13px' }}>Logout</button>
          </div>
        </div>

        {msg && (
          <div style={{ background: 'rgba(80,200,80,0.12)', border: '1px solid rgba(80,200,80,0.3)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', color: '#4f4', fontSize: '13px' }}>
            {msg} <button onClick={() => setMsg('')} style={{ float: 'right', background: 'none', border: 'none', color: '#4f4', cursor: 'pointer' }}>✕</button>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '20px' }}>
          {(['deposits', 'draws', 'users', 'settings', 'ads'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ ...tabStyle(t), flexShrink: 0 }}>
              {t === 'deposits' ? '💰 Deposits' : t === 'draws' ? '🏆 Draws' : t === 'users' ? '👥 Users' : t === 'settings' ? '⚙️ Settings' : '📢 Ads'}
            </button>
          ))}
        </div>

        {/* DEPOSITS TAB */}
        {tab === 'deposits' && !loading && (
          <>
            <h3 style={{ color: '#fff', fontWeight: 700, marginBottom: '14px', fontFamily: 'Poppins, sans-serif' }}>
              Deposits ({sortedDeposits.filter(d => d.status === 'pending').length} pending)
            </h3>
            {sortedDeposits.length === 0 && <p style={{ color: '#8888aa', textAlign: 'center', padding: '24px' }}>No deposits yet.</p>}
            {sortedDeposits.map(dep => (
              <div key={dep.id} style={{ ...cardStyle, border: `1px solid ${dep.status === 'pending' ? 'rgba(240,165,0,0.4)' : dep.status === 'approved' ? 'rgba(80,200,80,0.2)' : 'rgba(232,24,122,0.2)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
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

                {/* Background Type Selection */}
                <div>
                  <label style={{ color: '#aaa', fontSize: '12px', marginBottom: '6px', display: 'block' }}>🎨 Card Background</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[
                      { value: 'natural', label: '🌌 Natural', desc: 'Deep purple/blue' },
                      { value: 'custom', label: '🔥 Custom', desc: 'Crimson/dark' },
                      { value: 'picture', label: '🖼️ Picture', desc: 'Your image' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setNewDraw(f => ({ ...f, background_type: opt.value }))}
                        style={{
                          flex: 1, padding: '10px 6px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                          background: newDraw.background_type === opt.value
                            ? 'linear-gradient(135deg, #9b20d8, #e8187a)'
                            : 'rgba(155,32,216,0.1)',
                          color: '#fff', fontWeight: 600, fontSize: '12px',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                          boxShadow: newDraw.background_type === opt.value ? '0 0 12px rgba(155,32,216,0.5)' : 'none',
                          transition: 'all 0.2s',
                        }}
                      >
                        <span style={{ fontSize: '16px' }}>{opt.label.split(' ')[0]}</span>
                        <span style={{ fontSize: '11px', opacity: 0.85 }}>{opt.label.split(' ').slice(1).join(' ')}</span>
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Picture URL input (only for picture type) */}
                {newDraw.background_type === 'picture' && (
                  <div>
                    <label style={{ color: '#aaa', fontSize: '12px', marginBottom: '4px', display: 'block' }}>🔗 Background Image URL</label>
                    <input
                      type="url"
                      value={newDraw.background_image_url}
                      onChange={e => setNewDraw(f => ({ ...f, background_image_url: e.target.value }))}
                      placeholder="https://example.com/image.jpg"
                      style={inputStyle}
                    />
                    <p style={{ color: '#666', fontSize: '11px', marginTop: '4px' }}>A dark overlay will be applied automatically over the image.</p>
                  </div>
                )}

                {/* Preview of selected background */}
                <div style={{
                  height: '60px', borderRadius: '10px', overflow: 'hidden',
                  background: newDraw.background_type === 'custom'
                    ? 'linear-gradient(145deg, #1a0520 0%, #2d0a10 40%, #0a1a30 100%)'
                    : newDraw.background_type === 'picture' && newDraw.background_image_url
                      ? `linear-gradient(rgba(10,5,30,0.8), rgba(10,10,40,0.7)), url(${newDraw.background_image_url}) center/cover`
                      : 'linear-gradient(145deg, #2a0e50 0%, #150d40 45%, #0d1a50 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontFamily: 'Poppins, sans-serif',
                }}>
                  Preview background
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
                    <p style={{ color: '#666', fontSize: '11px' }}>BG: {draw.background_type || 'natural'}</p>
                  </div>
                  <span style={{ color: statusColor(draw.status), fontWeight: 700, fontSize: '12px' }}>{draw.status.toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {draw.status === 'upcoming' && (
                    <button onClick={() => updateDraw(draw.id, { status: 'live' })} style={{ padding: '7px 12px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: 'rgba(232,24,122,0.2)', color: '#e8187a', fontWeight: 600, fontSize: '12px' }}>▶ Go Live</button>
                  )}
                  {draw.status === 'live' && (
                    <>
                      <button onClick={() => navigate('/winner')} style={{ padding: '7px 12px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: 'rgba(240,165,0,0.2)', color: '#f0a500', fontWeight: 600, fontSize: '12px' }}>🏆 Pick Winner</button>
                      <button onClick={() => selectWinner(draw.id)} style={{ padding: '7px 12px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: 'rgba(155,32,216,0.2)', color: '#9b20d8', fontWeight: 600, fontSize: '12px' }}>🎲 Random</button>
                    </>
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
                    {u.referral_bonus_pct > 0 && u.referral_bonus_expires && new Date(u.referral_bonus_expires) > new Date() && (
                      <p style={{ color: '#f0a500', fontSize: '11px' }}>🎁 Referral bonus: {u.referral_bonus_pct}% (expires {new Date(u.referral_bonus_expires).toLocaleDateString('en-GB')})</p>
                    )}
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

        {/* ADS TAB */}
        {tab === 'ads' && !loading && (
          <>
            <div style={cardStyle}>
              <h3 style={{ color: '#fff', fontWeight: 700, marginBottom: '14px', fontFamily: 'Poppins, sans-serif' }}>📢 Create Ad</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ color: '#aaa', fontSize: '12px', marginBottom: '4px', display: 'block' }}>Type</label>
                  <select value={newAd.type} onChange={e => setNewAd(f => ({ ...f, type: e.target.value }))} style={{ ...inputStyle }}>
                    <option value="text">📝 Text</option>
                    <option value="image">🖼️ Image (URL)</option>
                    <option value="video">🎥 Video (URL)</option>
                  </select>
                </div>
                <div>
                  <label style={{ color: '#aaa', fontSize: '12px', marginBottom: '4px', display: 'block' }}>Title (optional)</label>
                  <input type="text" value={newAd.title} onChange={e => setNewAd(f => ({ ...f, title: e.target.value }))} placeholder="Ad headline..." style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: '#aaa', fontSize: '12px', marginBottom: '4px', display: 'block' }}>
                    {newAd.type === 'text' ? 'Ad Text' : newAd.type === 'image' ? 'Image URL' : 'Video URL'}
                  </label>
                  {newAd.type === 'text' ? (
                    <textarea value={newAd.content} onChange={e => setNewAd(f => ({ ...f, content: e.target.value }))} placeholder="Write your ad text..." rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
                  ) : (
                    <input type="url" value={newAd.content} onChange={e => setNewAd(f => ({ ...f, content: e.target.value }))} placeholder={newAd.type === 'image' ? 'https://example.com/image.jpg' : 'https://example.com/video.mp4'} style={inputStyle} />
                  )}
                </div>
                <div>
                  <label style={{ color: '#aaa', fontSize: '12px', marginBottom: '4px', display: 'block' }}>Link URL (optional)</label>
                  <input type="url" value={newAd.link_url} onChange={e => setNewAd(f => ({ ...f, link_url: e.target.value }))} placeholder="https://..." style={inputStyle} />
                </div>
                <button onClick={async () => {
                  if (!newAd.content.trim()) { setMsg('Content is required'); return }
                  const res = await fetch(`${BASE}/api/ads`, { method: 'POST', headers, body: JSON.stringify(newAd) })
                  if (res.ok) { setMsg('✅ Ad created!'); setNewAd({ type: 'text', title: '', content: '', link_url: '' }); loadAll() }
                  else { const d = await res.json().catch(() => ({})); setMsg(`❌ ${d.error || 'Failed to create ad'} (status ${res.status})`) }
                }} style={{ padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'linear-gradient(90deg, #f0a500, #e8187a)', color: '#fff', fontWeight: 700 }}>
                  + Post Ad
                </button>
              </div>
            </div>
            <h3 style={{ color: '#fff', fontWeight: 700, marginBottom: '12px', fontFamily: 'Poppins, sans-serif' }}>Active Ads ({ads.filter(a => a.is_active).length})</h3>
            {ads.length === 0 ? (
              <p style={{ color: '#8888aa', textAlign: 'center', padding: '24px' }}>No ads yet. Create one above.</p>
            ) : ads.map(ad => (
              <div key={ad.id} style={{ ...cardStyle, opacity: ad.is_active ? 1 : 0.5, border: `1px solid ${ad.is_active ? 'rgba(240,165,0,0.3)' : 'rgba(155,32,216,0.15)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <span style={{ color: '#f0a500', fontSize: '11px', fontWeight: 700, background: 'rgba(240,165,0,0.12)', borderRadius: '6px', padding: '2px 8px', marginRight: '8px' }}>
                      {ad.type === 'text' ? '📝' : ad.type === 'image' ? '🖼️' : '🎥'} {ad.type.toUpperCase()}
                    </span>
                    <span style={{ color: ad.is_active ? '#4f4' : '#8888aa', fontSize: '11px', fontWeight: 700 }}>{ad.is_active ? '● ACTIVE' : '○ HIDDEN'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={async () => {
                      await fetch(`${BASE}/api/ads/${ad.id}`, { method: 'PATCH', headers, body: JSON.stringify({ is_active: !ad.is_active }) })
                      loadAll()
                    }} style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: ad.is_active ? 'rgba(136,136,170,0.2)' : 'rgba(80,200,80,0.2)', color: ad.is_active ? '#aaa' : '#4f4', fontSize: '12px', fontWeight: 600 }}>
                      {ad.is_active ? 'Hide' : 'Show'}
                    </button>
                    <button onClick={async () => {
                      await fetch(`${BASE}/api/ads/${ad.id}`, { method: 'DELETE', headers })
                      setMsg('Ad deleted'); loadAll()
                    }} style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'rgba(232,24,122,0.15)', color: '#e8187a', fontSize: '12px', fontWeight: 600 }}>
                      🗑
                    </button>
                  </div>
                </div>
                {ad.title && <p style={{ color: '#fff', fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{ad.title}</p>}
                <p style={{ color: '#8888aa', fontSize: '12px', wordBreak: 'break-all' }}>{ad.content.slice(0, 80)}{ad.content.length > 80 ? '…' : ''}</p>
                {ad.link_url && <p style={{ color: '#9b20d8', fontSize: '11px', marginTop: '4px' }}>🔗 {ad.link_url.slice(0, 40)}…</p>}
              </div>
            ))}
          </>
        )}

        {/* SETTINGS TAB */}
        {tab === 'settings' && (
          <div style={cardStyle}>
            <h3 style={{ color: '#fff', fontWeight: 700, marginBottom: '16px', fontFamily: 'Poppins, sans-serif' }}>Settings</h3>
            <form onSubmit={saveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ borderBottom: '1px solid rgba(155,32,216,0.2)', paddingBottom: '16px', marginBottom: '4px' }}>
                <label style={{ color: '#f0a500', fontSize: '13px', marginBottom: '6px', display: 'block', fontWeight: 700 }}>📢 Pinned Announcement</label>
                <textarea
                  value={settings.announcement || ''}
                  onChange={e => setSettings(s => ({ ...s, announcement: e.target.value }))}
                  placeholder="এখানে announcement লিখুন... (খালি রাখলে পিন সরে যাবে)"
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                />
                <p style={{ color: '#666', fontSize: '11px', marginTop: '4px' }}>সব ইউজারের নোটিফিকেশনে পিন করা থাকবে।</p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await fetch(`${BASE}/api/settings`, { method: 'POST', headers, body: JSON.stringify(settings) })
                      if (res.ok) setMsg(settings.announcement ? '📢 Announcement published! All users notified.' : '🗑 Announcement removed')
                      else { const d = await res.json().catch(() => ({})); setMsg(`❌ ${d.error || 'Failed to save'} (status ${res.status})`) }
                    }}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: settings.announcement ? 'linear-gradient(90deg, #f0a500, #e8187a)' : 'rgba(136,136,170,0.2)', color: '#fff', fontWeight: 700, fontSize: '13px' }}
                  >
                    {settings.announcement ? '📢 Publish Announcement' : '🗑 Remove Announcement'}
                  </button>
                </div>
              </div>

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
