import { useEffect, useState, useMemo } from 'react'
import { useLocation } from 'wouter'
import { useAuth } from '../lib/auth'
import TopNav from '../components/TopNav'
import BottomNav from '../components/BottomNav'
import { Deposit, Ticket } from '../types'
import { formatCurrency, formatDate } from '../lib/utils'

import { API_BASE } from '../lib/apiBase'
const BASE = API_BASE

type TxEntry =
  | { kind: 'deposit'; data: Deposit }
  | { kind: 'ticket'; data: Ticket & { draw?: { name: string } } }

export default function WalletPage() {
  const [, navigate] = useLocation()
  const { user, token } = useAuth()
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    Promise.all([
      fetch(`${BASE}/api/deposits`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).catch(() => ({})),
      fetch(`${BASE}/api/tickets`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).catch(() => ({})),
    ]).then(([dd, td]) => {
      setDeposits(dd.deposits || [])
      setTickets(td.tickets || [])
    }).finally(() => setLoading(false))
  }, [token])

  const entries = useMemo<TxEntry[]>(() => {
    const list: TxEntry[] = [
      ...deposits.map(d => ({ kind: 'deposit' as const, data: d })),
      ...tickets.map(t => ({ kind: 'ticket' as const, data: t })),
    ]
    list.sort((a, b) => {
      const ta = new Date(a.data.created_at || 0).getTime()
      const tb = new Date(b.data.created_at || 0).getTime()
      return tb - ta
    })
    return list
  }, [deposits, tickets])

  const statusColor = (s: string) =>
    s === 'approved' ? '#4ade80' : s === 'rejected' ? '#f88' : '#f0a500'
  const statusBg = (s: string) =>
    s === 'approved' ? 'rgba(80,200,80,0.15)' : s === 'rejected' ? 'rgba(255,100,100,0.15)' : 'rgba(240,165,0,0.15)'

  return (
    <div className="app">
      <TopNav />
      <div style={{ padding: '18px 18px 100px' }}>

        {/* Balance overview */}
        <div style={{
          background: 'linear-gradient(135deg, #1a0b3e 0%, #0d1a3e 100%)',
          borderRadius: '20px', border: '1px solid rgba(155,32,216,0.3)',
          padding: '24px', marginBottom: '22px',
        }}>
          <p style={{ color: '#8888aa', fontSize: '13px', marginBottom: '6px' }}>Available Balance</p>
          <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '36px', fontWeight: 800, color: '#f0a500', marginBottom: '20px' }}>
            {formatCurrency(user?.balance || 0)}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { label: 'Total Deposited', value: formatCurrency(user?.total_deposited || 0), color: '#9b20d8' },
              { label: 'Total Won', value: formatCurrency(user?.total_won || 0), color: '#f0a500' },
              { label: 'Tickets Bought', value: user?.tickets_bought || 0, color: '#e8187a' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '12px' }}>
                <p style={{ color: '#8888aa', fontSize: '11px', marginBottom: '4px' }}>{label}</p>
                <p style={{ color, fontWeight: 700, fontSize: '16px' }}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
          <button onClick={() => navigate('/deposit')} style={{
            padding: '14px', borderRadius: '14px', border: 'none', cursor: 'pointer',
            background: 'linear-gradient(90deg, #e8187a, #9b20d8)', color: '#fff',
            fontFamily: 'Poppins, sans-serif', fontSize: '15px', fontWeight: 700,
          }}>+ Deposit</button>
          <button onClick={() => navigate('/draws')} style={{
            padding: '14px', borderRadius: '14px', border: '1px solid rgba(155,32,216,0.4)', cursor: 'pointer',
            background: 'transparent', color: '#9b20d8',
            fontFamily: 'Poppins, sans-serif', fontSize: '15px', fontWeight: 700,
          }}>🎟 Buy Tickets</button>
        </div>

        <h3 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#fff', fontSize: '16px', marginBottom: '14px' }}>
          Transaction History
        </h3>

        {loading ? (
          <p style={{ color: '#8888aa', textAlign: 'center', marginTop: '24px' }}>Loading…</p>
        ) : entries.length === 0 ? (
          <p style={{ color: '#8888aa', textAlign: 'center', marginTop: '24px' }}>No transactions yet</p>
        ) : entries.map((entry, idx) => {
          if (entry.kind === 'deposit') {
            const dep = entry.data
            return (
              <div key={`dep-${dep.id}`} style={{ background: '#100f28', borderRadius: '14px', border: '1px solid rgba(155,32,216,0.2)', padding: '16px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(74,222,128,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                    {dep.method === 'bkash' ? '📱' : dep.method === 'nagad' ? '💰' : '🚀'}
                  </div>
                  <div>
                    <p style={{ color: '#fff', fontWeight: 600, fontSize: '14px', textTransform: 'capitalize' }}>{dep.method} Deposit</p>
                    <p style={{ color: '#8888aa', fontSize: '12px' }}>{formatDate(dep.created_at)}</p>
                    <p style={{ color: '#8888aa', fontSize: '11px' }}>TRX: {dep.trx_id}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: '#4ade80', fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>+{formatCurrency(dep.amount)}</p>
                  <span style={{ background: statusBg(dep.status), color: statusColor(dep.status), borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: 700 }}>
                    {dep.status.toUpperCase()}
                  </span>
                </div>
              </div>
            )
          }

          const tk = entry.data as Ticket & { draw?: { name: string } }
          const drawName = tk.draw?.name || 'Draw'
          return (
            <div key={`tk-${tk.id || idx}`} style={{ background: '#100f28', borderRadius: '14px', border: '1px solid rgba(155,32,216,0.2)', padding: '16px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: tk.is_winner ? 'rgba(240,165,0,0.2)' : 'rgba(155,32,216,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                  {tk.is_winner ? '🏆' : '🎟️'}
                </div>
                <div>
                  <p style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>
                    Ticket #{tk.ticket_ref}
                    {tk.is_winner && <span style={{ marginLeft: '6px', color: '#f0a500', fontSize: '12px' }}>🏆 Winner!</span>}
                  </p>
                  <p style={{ color: '#8888aa', fontSize: '12px' }}>{drawName}</p>
                  <p style={{ color: '#8888aa', fontSize: '11px' }}>{formatDate(tk.created_at || '')}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#e8187a', fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>
                  -{formatCurrency((tk as any).price || (tk as any).draw?.ticket_price || 0)}
                </p>
                <span style={{ background: 'rgba(155,32,216,0.15)', color: '#9b20d8', borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: 700 }}>
                  TICKET
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <BottomNav />
    </div>
  )
}
