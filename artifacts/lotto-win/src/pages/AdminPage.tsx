import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { Deposit, Draw, User, Settings, Ad } from '../types'
import { formatCurrency, formatDate, formatJackpot } from '../lib/utils'

import { API_BASE } from '../lib/apiBase'
const BASE = API_BASE

type Tab = 'deposits' | 'draws' | 'users' | 'settings' | 'ads' | 'partners' | 'security' | 'campaigns'

type CampaignType = 'partner_discount' | 'free_ticket' | 'unlimited_internet' | 'cashback' | 'giveaway' | 'buy_x_get_y' | 'special_offer'

interface Campaign {
  id: string
  draw_id: string
  campaign_type: CampaignType
  title: string
  config: string
  is_active: boolean
  created_at: string
}

interface BusinessCode {
  id: string
  code: string
  discount_pct: number
  usage_limit: number
  per_person_limit: number | null
  usage_count: number
  expires_at: string | null
  is_active: boolean
  description: string
  created_at: string
}

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
  const [settings, setSettings] = useState<Settings>({ bkash_number: '', nagad_number: '', rocket_number: '', whatsapp_number: '', payment_number: '', announcement: '', user_code_enabled: false, user_code_buyer_discount_pct: 15, user_code_owner_reward_pct: 5, user_code_per_draw_limit: 5 })
  const [ads, setAds] = useState<Ad[]>([])
  const [businessCodes, setBusinessCodes] = useState<BusinessCode[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedDrawId, setSelectedDrawId] = useState<string>('')
  const [campaignType, setCampaignType] = useState<CampaignType>('partner_discount')
  const [campaignTitle, setCampaignTitle] = useState('')
  const [campaignConfig, setCampaignConfig] = useState<Record<string, string | number>>({})
  const [campaignResult, setCampaignResult] = useState<{ ok: boolean; text: string } | null>(null)
  const [newAd, setNewAd] = useState({ type: 'text', title: '', content: '', link_url: '' })
  const [adFilePreview, setAdFilePreview] = useState<string | null>(null)
  const [adUploadError, setAdUploadError] = useState<string | null>(null)
  const [adUploading, setAdUploading] = useState(false)
  const [adCreateResult, setAdCreateResult] = useState<{ ok: boolean; text: string } | null>(null)
  const [newCode, setNewCode] = useState({ code: '', usage_limit: '100', per_person_limit: '5', expires_at: '' })
  const [partnerCodeResult, setPartnerCodeResult] = useState<{ ok: boolean; text: string } | null>(null)
  const [settingsSaveResult, setSettingsSaveResult] = useState<{ ok: boolean; text: string } | null>(null)
  const [announcementResult, setAnnouncementResult] = useState<{ ok: boolean; text: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [newDraw, setNewDraw] = useState({
    name: '', jackpot: '', ticket_price: '', max_tickets: '', end_date: '',
    background_type: 'natural', background_image_url: '',
  })

  const [rejectModal, setRejectModal] = useState<{ depositId: string } | null>(null)
  const [rescheduleModal, setRescheduleModal] = useState<{ drawId: string; drawName: string } | null>(null)
  const [newEndDate, setNewEndDate] = useState('')
  const [depositBtnResult, setDepositBtnResult] = useState<Record<string, { ok: boolean; text: string } | null>>({})
  const [createDrawResult, setCreateDrawResult] = useState<{ ok: boolean; text: string } | null>(null)

  // 2FA / Security state
  const [totpQr, setTotpQr] = useState<string | null>(null)
  const [totpSecret, setTotpSecret] = useState<string | null>(null)
  const [totpToken, setTotpToken] = useState('')
  const [totpStatus, setTotpStatus] = useState<{ ok: boolean; text: string } | null>(null)
  const [totpLoading, setTotpLoading] = useState(false)
  const [totpEnabled, setTotpEnabled] = useState(false)

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const canvas = document.createElement('canvas')
        let { width, height } = img
        const maxDim = 1200
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round(height * maxDim / width); width = maxDim }
          else { width = Math.round(width * maxDim / height); height = maxDim }
        }
        canvas.width = width; canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, width, height)
        let quality = 0.82
        let dataUrl = canvas.toDataURL('image/jpeg', quality)
        while (dataUrl.length > 3 * 1024 * 1024 && quality > 0.3) {
          quality -= 0.08
          dataUrl = canvas.toDataURL('image/jpeg', quality)
        }
        resolve(dataUrl)
      }
      img.onerror = reject
      img.src = url
    })
  }

  useEffect(() => {
    if (!token) { navigate('/lw-secure-7x9k'); return }
    loadAll()
  }, [token])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [d, dr, u, s, a, bc, camp] = await Promise.all([
        fetch(`${BASE}/api/admin/deposits`, { headers }).then(r => r.json()).catch(() => ({})),
        fetch(`${BASE}/api/draws`).then(r => r.json()).catch(() => ({})),
        fetch(`${BASE}/api/admin/users`, { headers }).then(r => r.json()).catch(() => ({})),
        fetch(`${BASE}/api/settings`).then(r => r.json()).catch(() => ({})),
        fetch(`${BASE}/api/ads/all`, { headers }).then(r => r.json()).catch(() => ({})),
        fetch(`${BASE}/api/business-codes`, { headers }).then(r => r.json()).catch(() => ({})),
        fetch(`${BASE}/api/campaigns/all`, { headers }).then(r => r.json()).catch(() => ({})),
      ])
      setDeposits(d.deposits || [])
      setDraws(dr.draws || [])
      setUsers(u.users || [])
      if (s.settings) setSettings(s.settings)
      setAds(a.ads || [])
      setBusinessCodes(bc.codes || [])
      setCampaigns(camp.campaigns || [])
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
    const ok = res.ok
    const resultText = action === 'approve' ? (ok ? '✅ Approved!' : '❌ Failed') : (ok ? '✅ Rejected' : '❌ Failed')
    setDepositBtnResult(r => ({ ...r, [id]: { ok, text: resultText } }))
    setTimeout(() => setDepositBtnResult(r => ({ ...r, [id]: null })), 3000)
    if (ok) { setMsg(`Deposit ${action}d`); loadAll() }
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
      setCreateDrawResult({ ok: true, text: '✅ Draw Created!' })
      setTimeout(() => setCreateDrawResult(null), 3000)
      setMsg('Draw created')
      setNewDraw({ name: '', jackpot: '', ticket_price: '', max_tickets: '', end_date: '', background_type: 'natural', background_image_url: '' })
      loadAll()
    } else {
      setCreateDrawResult({ ok: false, text: '❌ Failed' })
      setTimeout(() => setCreateDrawResult(null), 3000)
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
    const ok = res.ok
    setSettingsSaveResult({ ok, text: ok ? '✅ Settings saved!' : '❌ Failed to save' })
    setTimeout(() => setSettingsSaveResult(null), 3000)
  }

  const createBusinessCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setPartnerCodeResult(null)
    const res = await fetch(`${BASE}/api/business-codes`, {
      method: 'POST', headers,
      body: JSON.stringify({
        code: newCode.code.trim().toUpperCase(),
        usage_limit: Number(newCode.usage_limit),
        per_person_limit: newCode.per_person_limit ? Number(newCode.per_person_limit) : undefined,
        expires_at: newCode.expires_at || undefined,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      setPartnerCodeResult({ ok: true, text: '✅ Code তৈরি হয়েছে!' })
      setNewCode({ code: '', usage_limit: '100', per_person_limit: '5', expires_at: '' })
      setTimeout(() => setPartnerCodeResult(null), 3000)
      loadAll()
    } else {
      setPartnerCodeResult({ ok: false, text: `❌ ${data.error || 'Failed'}` })
      setTimeout(() => setPartnerCodeResult(null), 4000)
    }
  }

  const campaignTypeLabels: Record<CampaignType, string> = {
    partner_discount: '🏷️ Business Partner Discount',
    free_ticket: '🎟️ Free Ticket',
    unlimited_internet: '📶 Unlimited Internet',
    cashback: '💰 Cashback',
    giveaway: '🎁 Giveaway',
    buy_x_get_y: '🛒 Buy X Get Y',
    special_offer: '⭐ Special Offer (Eid/Event)',
  }

  const campaignConfigFields: Record<CampaignType, { key: string; label: string; type: 'number' | 'text'; placeholder: string }[]> = {
    partner_discount: [{ key: 'discount_pct', label: 'Discount %', type: 'number', placeholder: '20' }],
    free_ticket: [{ key: 'winners_count', label: 'কতজন Free Ticket পাবে', type: 'number', placeholder: '5' }],
    unlimited_internet: [{ key: 'winners_count', label: 'কতজন Winner হবে', type: 'number', placeholder: '3' }],
    cashback: [{ key: 'amount', label: 'Cashback টাকা (৳)', type: 'number', placeholder: '100' }],
    giveaway: [
      { key: 'prize', label: 'Prize বিবরণ', type: 'text', placeholder: 'iPhone 16, Laptop...' },
      { key: 'winners_count', label: 'কতজন Winner হবে', type: 'number', placeholder: '2' },
    ],
    buy_x_get_y: [
      { key: 'buy_x', label: 'Buy কতটা', type: 'number', placeholder: '2' },
      { key: 'get_y', label: 'Get কতটা', type: 'number', placeholder: '1' },
    ],
    special_offer: [
      { key: 'discount_pct', label: 'Discount %', type: 'number', placeholder: '30' },
      { key: 'label', label: 'অফারের নাম', type: 'text', placeholder: 'Eid Special, New Year...' },
    ],
  }

  const createCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDrawId || !campaignTitle.trim()) return
    setCampaignResult(null)
    const res = await fetch(`${BASE}/api/campaigns`, {
      method: 'POST', headers,
      body: JSON.stringify({
        draw_id: selectedDrawId,
        campaign_type: campaignType,
        title: campaignTitle.trim(),
        config: campaignConfig,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      setCampaignResult({ ok: true, text: '✅ Campaign তৈরি হয়েছে!' })
      setCampaignTitle('')
      setCampaignConfig({})
      setTimeout(() => setCampaignResult(null), 3000)
      loadAll()
    } else {
      setCampaignResult({ ok: false, text: `❌ ${data.error || 'Failed'}` })
      setTimeout(() => setCampaignResult(null), 3000)
    }
  }

  const deleteCampaign = async (id: string) => {
    if (!confirm('এই Campaign মুছে ফেলবেন?')) return
    await fetch(`${BASE}/api/campaigns/${id}`, { method: 'DELETE', headers })
    loadAll()
  }

  const toggleCampaign = async (id: string, is_active: boolean) => {
    await fetch(`${BASE}/api/campaigns/${id}`, { method: 'PATCH', headers, body: JSON.stringify({ is_active }) })
    loadAll()
  }

  const toggleCodeActive = async (id: string, is_active: boolean) => {
    await fetch(`${BASE}/api/business-codes/${id}`, { method: 'PATCH', headers, body: JSON.stringify({ is_active }) })
    loadAll()
  }

  const deleteCode = async (id: string) => {
    if (!confirm('Delete this partner code?')) return
    await fetch(`${BASE}/api/business-codes/${id}`, { method: 'DELETE', headers })
    loadAll()
  }

  const setupTotp = async () => {
    setTotpLoading(true); setTotpStatus(null)
    const res = await fetch(`${BASE}/api/totp/setup`, { method: 'POST', headers })
    const data = await res.json()
    setTotpLoading(false)
    if (!res.ok) { setTotpStatus({ ok: false, text: data.error || 'Setup failed' }); return }
    setTotpQr(data.qr)
    setTotpSecret(data.secret)
  }

  const enableTotp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (totpToken.length < 6) return
    setTotpLoading(true); setTotpStatus(null)
    const res = await fetch(`${BASE}/api/totp/enable`, {
      method: 'POST', headers, body: JSON.stringify({ token: totpToken }),
    })
    const data = await res.json()
    setTotpLoading(false)
    if (!res.ok) { setTotpStatus({ ok: false, text: data.error || 'Verification failed' }); return }
    setTotpEnabled(true)
    setTotpStatus({ ok: true, text: '✅ 2FA enabled successfully!' })
    setTotpQr(null); setTotpSecret(null); setTotpToken('')
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
          {(['deposits', 'draws', 'campaigns', 'users', 'partners', 'settings', 'ads', 'security'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ ...tabStyle(t), flexShrink: 0 }}>
              {t === 'deposits' ? '💰 Deposits'
                : t === 'draws' ? '🏆 Draws'
                : t === 'campaigns' ? '🎯 Campaigns'
                : t === 'users' ? '👥 Users'
                : t === 'partners' ? '🏢 Partners'
                : t === 'settings' ? '⚙️ Settings'
                : t === 'security' ? '🔒 Security'
                : '📢 Ads'}
            </button>
          ))}
        </div>

        {/* CAMPAIGNS TAB */}
        {tab === 'campaigns' && !loading && (
          <>
            <h3 style={{ color: '#fff', fontWeight: 700, marginBottom: '14px', fontFamily: 'Poppins, sans-serif' }}>🎯 Campaign Management</h3>

            {/* Step 1: Draw selector */}
            <div>
              <div style={{ background: '#100f28', borderRadius: '14px', border: '1px solid rgba(155,32,216,0.2)', padding: '16px', marginBottom: '12px' }}>
                <p style={{ color: '#9b20d8', fontWeight: 700, fontSize: '13px', marginBottom: '10px' }}>Step 1: Draw নির্বাচন করো</p>
                <select
                  value={selectedDrawId}
                  onChange={e => setSelectedDrawId(e.target.value)}
                  style={{ ...inputStyle }}
                >
                  <option value="">— Draw বেছে নিন —</option>
                  {draws.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.status})</option>
                  ))}
                </select>
              </div>

              {selectedDrawId && (
                <>
                  {/* Step 2: Campaign form */}
                  <div style={{ background: '#100f28', borderRadius: '14px', border: '1px solid rgba(232,24,122,0.25)', padding: '16px', marginBottom: '12px' }}>
                    <p style={{ color: '#e8187a', fontWeight: 700, fontSize: '13px', marginBottom: '12px' }}>Step 2: Add Campaign</p>
                    <form onSubmit={createCampaign} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <label style={{ color: '#aaa', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Campaign Title</label>
                        <input
                          value={campaignTitle}
                          onChange={e => setCampaignTitle(e.target.value)}
                          placeholder="e.g. Eid Special Offer"
                          required
                          style={inputStyle}
                        />
                      </div>

                      <div>
                        <label style={{ color: '#aaa', fontSize: '12px', display: 'block', marginBottom: '8px' }}>Step 3: Campaign Type নির্বাচন করো</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {(Object.keys(campaignTypeLabels) as CampaignType[]).map(t => (
                            <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px 10px', borderRadius: '8px', background: campaignType === t ? 'rgba(155,32,216,0.15)' : 'transparent', border: `1px solid ${campaignType === t ? 'rgba(155,32,216,0.5)' : 'rgba(155,32,216,0.1)'}`, transition: 'all 0.2s' }}>
                              <input
                                type="radio"
                                name="campaign_type"
                                value={t}
                                checked={campaignType === t}
                                onChange={() => { setCampaignType(t); setCampaignConfig({}) }}
                                style={{ accentColor: '#9b20d8' }}
                              />
                              <span style={{ color: '#fff', fontSize: '13px', fontWeight: 500 }}>{campaignTypeLabels[t]}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Dynamic config fields */}
                      {campaignConfigFields[campaignType].length > 0 && (
                        <div style={{ borderTop: '1px solid rgba(155,32,216,0.15)', paddingTop: '10px' }}>
                          <p style={{ color: '#9999bb', fontSize: '12px', marginBottom: '8px' }}>⚙️ Campaign Settings:</p>
                          {campaignConfigFields[campaignType].map(field => (
                            <div key={field.key} style={{ marginBottom: '8px' }}>
                              <label style={{ color: '#aaa', fontSize: '12px', display: 'block', marginBottom: '4px' }}>{field.label}</label>
                              <input
                                type={field.type}
                                value={String(campaignConfig[field.key] || '')}
                                onChange={e => setCampaignConfig(c => ({ ...c, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value }))}
                                placeholder={field.placeholder}
                                style={inputStyle}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {campaignResult && (
                        <p style={{ color: campaignResult.ok ? '#4f4' : '#f88', fontSize: '13px', fontWeight: 600 }}>{campaignResult.text}</p>
                      )}

                      <button
                        type="submit"
                        disabled={!selectedDrawId || !campaignTitle.trim()}
                        style={{ padding: '11px', borderRadius: '10px', border: 'none', cursor: (!selectedDrawId || !campaignTitle.trim()) ? 'not-allowed' : 'pointer', background: 'linear-gradient(90deg, #9b20d8, #e8187a)', color: '#fff', fontWeight: 700, fontSize: '14px', opacity: (!selectedDrawId || !campaignTitle.trim()) ? 0.5 : 1 }}
                      >
                        ➕ Campaign যোগ করো
                      </button>
                    </form>
                  </div>

                  {/* Campaigns list for selected draw */}
                  <div>
                    <p style={{ color: '#aaa', fontWeight: 700, fontSize: '13px', marginBottom: '10px' }}>
                      📋 এই Draw-এর Campaigns ({campaigns.filter(c => c.draw_id === selectedDrawId).length})
                    </p>
                    {campaigns.filter(c => c.draw_id === selectedDrawId).length === 0 ? (
                      <p style={{ color: '#8888aa', fontSize: '13px', textAlign: 'center', padding: '16px' }}>কোনো campaign নেই। উপরে নতুন campaign যোগ করুন।</p>
                    ) : campaigns.filter(c => c.draw_id === selectedDrawId).map(camp => {
                      let configObj: Record<string, string | number> = {}
                      try { configObj = JSON.parse(camp.config) } catch { configObj = {} }
                      return (
                        <div key={camp.id} style={{ background: '#0d0c22', borderRadius: '12px', border: `1px solid ${camp.is_active ? 'rgba(155,32,216,0.3)' : 'rgba(136,136,170,0.15)'}`, padding: '12px 14px', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                            <div style={{ flex: 1 }}>
                              <p style={{ color: '#fff', fontWeight: 700, fontSize: '14px', marginBottom: '3px' }}>{camp.title}</p>
                              <p style={{ color: '#9b20d8', fontSize: '12px', marginBottom: '4px' }}>{campaignTypeLabels[camp.campaign_type]}</p>
                              {Object.entries(configObj).map(([k, v]) => (
                                <span key={k} style={{ display: 'inline-block', background: 'rgba(155,32,216,0.1)', borderRadius: '6px', padding: '2px 8px', marginRight: '6px', marginBottom: '4px', color: '#ccc', fontSize: '11px' }}>
                                  {k}: {v}
                                </span>
                              ))}
                            </div>
                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: camp.is_active ? 'rgba(34,197,94,0.15)' : 'rgba(136,136,170,0.15)', color: camp.is_active ? '#6ee7a0' : '#8888aa', border: `1px solid ${camp.is_active ? 'rgba(34,197,94,0.3)' : 'rgba(136,136,170,0.3)'}`, flexShrink: 0, marginLeft: '8px' }}>
                              {camp.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => toggleCampaign(camp.id, !camp.is_active)}
                              style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: camp.is_active ? 'rgba(136,136,170,0.15)' : 'rgba(34,197,94,0.15)', color: camp.is_active ? '#8888aa' : '#6ee7a0', fontSize: '12px', fontWeight: 600 }}
                            >
                              {camp.is_active ? '⏸ Deactivate' : '▶️ Activate'}
                            </button>
                            <button
                              onClick={() => deleteCampaign(camp.id)}
                              style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'rgba(232,24,122,0.1)', color: '#e8187a', fontSize: '12px', fontWeight: 600 }}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </>
        )}

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
                    <button
                      onClick={() => processDeposit(dep.id, 'approve')}
                      style={{
                        flex: 1, padding: '9px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                        background: depositBtnResult[dep.id]?.ok === true
                          ? 'rgba(80,200,80,0.4)'
                          : 'rgba(80,200,80,0.2)',
                        color: '#4f4', fontWeight: 700, fontSize: '13px',
                        transition: 'background 0.3s',
                      }}
                    >
                      {depositBtnResult[dep.id] && depositBtnResult[dep.id]!.ok ? depositBtnResult[dep.id]!.text : '✅ Approve'}
                    </button>
                    <button
                      onClick={() => setRejectModal({ depositId: dep.id })}
                      style={{
                        flex: 1, padding: '9px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                        background: depositBtnResult[dep.id]?.ok === false
                          ? 'rgba(232,24,122,0.4)'
                          : 'rgba(232,24,122,0.2)',
                        color: '#e8187a', fontWeight: 700, fontSize: '13px',
                        transition: 'background 0.3s',
                      }}
                    >
                      {depositBtnResult[dep.id] && !depositBtnResult[dep.id]!.ok ? depositBtnResult[dep.id]!.text : '❌ Reject'}
                    </button>
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
                  </div>
                )}

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

                <button
                  type="submit"
                  style={{
                    padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                    background: createDrawResult
                      ? (createDrawResult.ok ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'linear-gradient(90deg, #e8187a, #c01460)')
                      : 'linear-gradient(90deg, #f0a500, #e8187a)',
                    color: '#fff', fontWeight: 700,
                    transition: 'background 0.3s',
                  }}
                >
                  {createDrawResult ? createDrawResult.text : 'Create Draw'}
                </button>
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

        {/* PARTNERS TAB */}
        {tab === 'partners' && !loading && (
          <>
            {/* Create Business Partner Code */}
            <div style={cardStyle}>
              <h3 style={{ color: '#fff', fontWeight: 700, marginBottom: '6px', fontFamily: 'Poppins, sans-serif' }}>🏢 নতুন পার্টনার কোড তৈরি করো</h3>
              <p style={{ color: '#8888aa', fontSize: '12px', marginBottom: '14px' }}>কোড দিয়ে টিকিট কেনার সীমা নিয়ন্ত্রণ করো।</p>
              <form onSubmit={createBusinessCode} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ color: '#aaa', fontSize: '12px', marginBottom: '4px', display: 'block' }}>কোডের নাম (e.g. EID2025)</label>
                  <input
                    type="text"
                    value={newCode.code}
                    onChange={e => setNewCode(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="EID2025"
                    required
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ color: '#aaa', fontSize: '12px', marginBottom: '4px', display: 'block' }}>মোট টিকিট লিমিট</label>
                    <input type="number" value={newCode.usage_limit} onChange={e => setNewCode(f => ({ ...f, usage_limit: e.target.value }))} min={1} required placeholder="100" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: '#aaa', fontSize: '12px', marginBottom: '4px', display: 'block' }}>একজনে সর্বোচ্চ টিকিট</label>
                    <input type="number" value={newCode.per_person_limit} onChange={e => setNewCode(f => ({ ...f, per_person_limit: e.target.value }))} min={1} placeholder="5" style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={{ color: '#aaa', fontSize: '12px', marginBottom: '4px', display: 'block' }}>মেয়াদ শেষের তারিখ (optional)</label>
                  <input type="datetime-local" value={newCode.expires_at} onChange={e => setNewCode(f => ({ ...f, expires_at: e.target.value }))} style={inputStyle} />
                </div>
                <button type="submit" style={{
                  padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  background: partnerCodeResult
                    ? partnerCodeResult.ok ? 'linear-gradient(90deg,#22c55e,#16a34a)' : 'linear-gradient(90deg,#e8187a,#c01460)'
                    : 'linear-gradient(90deg, #f0a500, #e8187a)',
                  color: '#fff', fontWeight: 700, transition: 'background 0.3s',
                }}>
                  {partnerCodeResult ? partnerCodeResult.text : '➕ কোড তৈরি করো'}
                </button>
              </form>
            </div>

            {/* Code List */}
            <h3 style={{ color: '#fff', fontWeight: 700, marginBottom: '12px', fontFamily: 'Poppins, sans-serif' }}>
              Active Codes ({businessCodes.filter(c => c.is_active).length}/{businessCodes.length})
            </h3>
            {businessCodes.length === 0 ? (
              <p style={{ color: '#8888aa', textAlign: 'center', padding: '24px' }}>কোনো পার্টনার কোড নেই। উপরে নতুন কোড তৈরি করুন।</p>
            ) : businessCodes.map(bc => (
              <div key={bc.id} style={{ ...cardStyle, opacity: bc.is_active ? 1 : 0.55, border: `1px solid ${bc.is_active ? 'rgba(240,165,0,0.3)' : 'rgba(155,32,216,0.15)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <p style={{ color: '#f0a500', fontWeight: 800, fontSize: '16px', fontFamily: 'monospace', letterSpacing: '2px' }}>{bc.code}</p>
                    <p style={{ color: '#8888aa', fontSize: '12px' }}>
                      মোট লিমিট: {bc.usage_limit} টিকিট
                      {bc.per_person_limit ? ` · একজনে সর্বোচ্চ: ${bc.per_person_limit}` : ''}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: '#4f4', fontWeight: 700, fontSize: '13px' }}>{bc.usage_count}/{bc.usage_limit} ব্যবহার</p>
                    <p style={{ color: bc.is_active ? '#9b20d8' : '#888', fontSize: '11px', fontWeight: 700 }}>{bc.is_active ? '● সক্রিয়' : '○ বন্ধ'}</p>
                  </div>
                </div>
                {bc.expires_at && (
                  <p style={{ color: new Date(bc.expires_at) < new Date() ? '#f88' : '#8888aa', fontSize: '11px', marginBottom: '8px' }}>
                    মেয়াদ: {new Date(bc.expires_at).toLocaleDateString('bn-BD')}
                    {new Date(bc.expires_at) < new Date() && ' ⚠️ মেয়াদ শেষ'}
                  </p>
                )}
                {/* Progress bar */}
                <div style={{ background: 'rgba(155,32,216,0.2)', borderRadius: '4px', height: '4px', marginBottom: '10px' }}>
                  <div style={{ width: `${Math.min(100, (bc.usage_count / bc.usage_limit) * 100)}%`, background: '#9b20d8', borderRadius: '4px', height: '100%' }} />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => toggleCodeActive(bc.id, !bc.is_active)}
                    style={{ flex: 1, padding: '7px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: bc.is_active ? 'rgba(136,136,170,0.2)' : 'rgba(80,200,80,0.2)', color: bc.is_active ? '#aaa' : '#4f4', fontWeight: 600, fontSize: '12px' }}
                  >
                    {bc.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => deleteCode(bc.id)}
                    style={{ padding: '7px 12px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: 'rgba(232,24,122,0.15)', color: '#e8187a', fontWeight: 600, fontSize: '12px' }}
                  >
                    🗑
                  </button>
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
                  <select value={newAd.type} onChange={e => {
                    setNewAd(f => ({ ...f, type: e.target.value, content: '' }))
                    setAdFilePreview(null)
                    setAdUploadError(null)
                  }} style={{ ...inputStyle }}>
                    <option value="text">📝 Text</option>
                    <option value="image">🖼️ Image (ফাইল আপলোড)</option>
                    <option value="video">🎥 Video (ফাইল আপলোড)</option>
                  </select>
                </div>
                <div>
                  <label style={{ color: '#aaa', fontSize: '12px', marginBottom: '4px', display: 'block' }}>Title (optional)</label>
                  <input type="text" value={newAd.title} onChange={e => setNewAd(f => ({ ...f, title: e.target.value }))} placeholder="Ad headline..." style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: '#aaa', fontSize: '12px', marginBottom: '4px', display: 'block' }}>
                    {newAd.type === 'text' ? 'Ad Text' : newAd.type === 'image' ? '🖼️ ছবি সিলেক্ট করো (Gallery থেকে)' : '🎥 ভিডিও সিলেক্ট করো (Gallery থেকে)'}
                  </label>
                  {newAd.type === 'text' ? (
                    <textarea value={newAd.content} onChange={e => setNewAd(f => ({ ...f, content: e.target.value }))} placeholder="Write your ad text..." rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
                  ) : (
                    <div>
                      <label style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        padding: '20px', borderRadius: '12px', cursor: 'pointer',
                        border: '2px dashed rgba(155,32,216,0.5)',
                        background: adFilePreview ? 'rgba(155,32,216,0.08)' : 'rgba(155,32,216,0.05)',
                        color: '#9b20d8', fontWeight: 600, fontSize: '14px',
                        transition: 'all 0.2s',
                      }}>
                        <span style={{ fontSize: '24px' }}>{newAd.type === 'image' ? '🖼️' : '🎥'}</span>
                        <span>{adFilePreview ? '✅ ফাইল সিলেক্ট হয়েছে — পরিবর্তন করতে এখানে চাপো' : `${newAd.type === 'image' ? 'ছবি' : 'ভিডিও'} সিলেক্ট করতে এখানে চাপো`}</span>
                        <input
                          type="file"
                          accept={newAd.type === 'image' ? 'image/*' : 'video/*'}
                          style={{ display: 'none' }}
                          onChange={async e => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            if (newAd.type === 'image') {
                              const maxMB = 10
                              if (file.size > maxMB * 1024 * 1024) {
                                setAdUploadError(`ছবি সাইজ ${maxMB}MB এর বেশি হবে না`)
                                return
                              }
                              setAdUploadError(null)
                              setAdUploading(true)
                              try {
                                const compressed = await compressImage(file)
                                setNewAd(f => ({ ...f, content: compressed }))
                                setAdFilePreview(compressed)
                              } catch {
                                setAdUploadError('ছবি প্রসেস করা যায়নি। আবার চেষ্টা করুন।')
                              }
                              setAdUploading(false)
                            } else {
                              const maxMB = 50
                              if (file.size > maxMB * 1024 * 1024) {
                                setAdUploadError(`ভিডিও সাইজ ${maxMB}MB এর বেশি হবে না`)
                                return
                              }
                              setAdUploadError(null)
                              setAdUploading(true)
                              const reader = new FileReader()
                              reader.onload = ev => {
                                const dataUrl = ev.target?.result as string
                                setNewAd(f => ({ ...f, content: dataUrl }))
                                setAdFilePreview(dataUrl)
                                setAdUploading(false)
                              }
                              reader.readAsDataURL(file)
                            }
                          }}
                        />
                      </label>
                      {adUploadError && <p style={{ color: '#e8187a', fontSize: '12px', marginTop: '6px' }}>⚠️ {adUploadError}</p>}
                      {adUploading && <p style={{ color: '#9b20d8', fontSize: '12px', marginTop: '6px' }}>⏳ লোড হচ্ছে...</p>}
                      {adFilePreview && (
                        <div style={{ marginTop: '10px', borderRadius: '10px', overflow: 'hidden', background: '#000', position: 'relative' }}>
                          {newAd.type === 'image' ? (
                            <img src={adFilePreview} alt="preview" style={{ width: '100%', height: 'auto', maxHeight: '240px', objectFit: 'contain', display: 'block' }} />
                          ) : (
                            <video src={adFilePreview} muted style={{ width: '100%', height: 'auto', maxHeight: '240px', objectFit: 'contain', display: 'block' }} />
                          )}
                          <div style={{ position: 'absolute', bottom: '6px', right: '8px', background: 'rgba(0,0,0,0.6)', color: '#4f4', fontSize: '11px', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>Preview</div>
                        </div>
                      )}
                      {newAd.type === 'image' && <p style={{ color: '#555', fontSize: '11px', marginTop: '6px' }}>সর্বোচ্চ 10MB · JPG, PNG, GIF, WebP (স্বয়ংক্রিয় compress হবে)</p>}
                      {newAd.type === 'video' && <p style={{ color: '#555', fontSize: '11px', marginTop: '6px' }}>সর্বোচ্চ 50MB · MP4, WebM</p>}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ color: '#aaa', fontSize: '12px', marginBottom: '4px', display: 'block' }}>Link URL (optional)</label>
                  <input type="url" value={newAd.link_url} onChange={e => setNewAd(f => ({ ...f, link_url: e.target.value }))} placeholder="https://..." style={inputStyle} />
                </div>
                <button onClick={async () => {
                  if (!newAd.content.trim()) { setAdCreateResult({ ok: false, text: '⚠️ ছবি/ভিডিও/টেক্সট সিলেক্ট করো' }); setTimeout(() => setAdCreateResult(null), 3000); return }
                  setAdCreateResult(null)
                  const res = await fetch(`${BASE}/api/ads`, { method: 'POST', headers, body: JSON.stringify(newAd) })
                  if (res.ok) {
                    setAdCreateResult({ ok: true, text: '✅ Ad তৈরি হয়েছে!' })
                    setNewAd({ type: 'text', title: '', content: '', link_url: '' })
                    setAdFilePreview(null); setAdUploadError(null)
                    setTimeout(() => setAdCreateResult(null), 3000)
                    loadAll()
                  } else {
                    const d = await res.json().catch(() => ({}))
                    setAdCreateResult({ ok: false, text: `❌ ${d.error || 'Failed'} (${res.status})` })
                    setTimeout(() => setAdCreateResult(null), 4000)
                  }
                }} disabled={adUploading} style={{
                  padding: '10px', borderRadius: '8px', border: 'none',
                  cursor: adUploading ? 'not-allowed' : 'pointer',
                  background: adUploading ? 'rgba(155,32,216,0.3)'
                    : adCreateResult ? adCreateResult.ok ? 'linear-gradient(90deg,#22c55e,#16a34a)' : 'linear-gradient(90deg,#e8187a,#c01460)'
                    : 'linear-gradient(90deg, #f0a500, #e8187a)',
                  color: '#fff', fontWeight: 700, opacity: adUploading ? 0.6 : 1, transition: 'background 0.3s',
                }}>
                  {adUploading ? '⏳ লোড হচ্ছে...' : adCreateResult ? adCreateResult.text : '+ Ad পোস্ট করো'}
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
                      if (!window.confirm(`Delete this ad?\n\n"${ad.title || ad.content.slice(0, 60)}"\n\nThis cannot be undone.`)) return
                      const r = await fetch(`${BASE}/api/ads/${ad.id}`, { method: 'DELETE', headers })
                      if (r.ok) { setMsg('✅ Ad deleted'); loadAll() }
                      else { setMsg('❌ Failed to delete ad') }
                    }} style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'rgba(232,24,122,0.15)', color: '#e8187a', fontSize: '12px', fontWeight: 600 }}>
                      🗑 Delete
                    </button>
                  </div>
                </div>
                {ad.title && <p style={{ color: '#fff', fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{ad.title}</p>}
                {ad.type === 'image' && ad.content ? (
                  <div style={{ borderRadius: '8px', overflow: 'hidden', background: '#000', marginBottom: '6px' }}>
                    <img src={ad.content} alt={ad.title} style={{ width: '100%', height: 'auto', maxHeight: '160px', objectFit: 'contain', display: 'block' }} />
                  </div>
                ) : ad.type === 'video' && ad.content ? (
                  <div style={{ borderRadius: '8px', overflow: 'hidden', background: '#000', marginBottom: '6px', position: 'relative' }}>
                    <video src={ad.content} muted style={{ width: '100%', height: 'auto', maxHeight: '160px', objectFit: 'contain', display: 'block' }} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '28px', opacity: 0.8 }}>▶️</span>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: '#8888aa', fontSize: '12px' }}>{ad.content.slice(0, 100)}{ad.content.length > 100 ? '…' : ''}</p>
                )}
                {ad.link_url && <p style={{ color: '#9b20d8', fontSize: '11px', marginTop: '4px' }}>🔗 {ad.link_url.slice(0, 40)}</p>}
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
                      const ok2 = res.ok
                      setAnnouncementResult({ ok: ok2, text: ok2 ? (settings.announcement ? '✅ Published!' : '✅ Removed') : '❌ Failed' })
                      setTimeout(() => setAnnouncementResult(null), 3000)
                    }}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      background: announcementResult
                        ? announcementResult.ok ? 'linear-gradient(90deg,#22c55e,#16a34a)' : 'linear-gradient(90deg,#e8187a,#c01460)'
                        : settings.announcement ? 'linear-gradient(90deg, #f0a500, #e8187a)' : 'rgba(136,136,170,0.2)',
                      color: '#fff', fontWeight: 700, fontSize: '13px', transition: 'background 0.3s',
                    }}
                  >
                    {announcementResult ? announcementResult.text : settings.announcement ? '📢 Publish Announcement' : '🗑 Remove Announcement'}
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
              <button type="submit" style={{
                padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                background: settingsSaveResult
                  ? settingsSaveResult.ok ? 'linear-gradient(90deg,#22c55e,#16a34a)' : 'linear-gradient(90deg,#e8187a,#c01460)'
                  : 'linear-gradient(90deg, #9b20d8, #e8187a)',
                color: '#fff', fontWeight: 700, transition: 'background 0.3s',
              }}>
                {settingsSaveResult ? settingsSaveResult.text : 'Save Settings'}
              </button>
            </form>
          </div>
        )}

        {/* SECURITY TAB — Admin 2FA Setup */}
        {tab === 'security' && (
          <div>
            <h3 style={{ color: '#fff', fontWeight: 700, marginBottom: '6px', fontFamily: 'Poppins, sans-serif' }}>🔒 Security Settings</h3>
            <p style={{ color: '#8888aa', fontSize: '13px', marginBottom: '20px' }}>Manage two-factor authentication for your admin account.</p>

            {/* 2FA Card */}
            <div style={{ background: '#100f28', borderRadius: '16px', border: '1px solid rgba(155,32,216,0.25)', padding: '24px', marginBottom: '16px', maxWidth: '460px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #9b20d8, #e8187a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>🔐</div>
                <div>
                  <p style={{ color: '#fff', fontWeight: 700, margin: 0, fontSize: '15px' }}>Authenticator App (TOTP)</p>
                  <p style={{ color: '#8888aa', fontSize: '12px', margin: 0 }}>Google Authenticator / Authy compatible</p>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <span style={{
                    padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                    background: totpEnabled ? 'rgba(34,197,94,0.15)' : 'rgba(240,165,0,0.15)',
                    color: totpEnabled ? '#6ee7a0' : '#f0a500',
                    border: `1px solid ${totpEnabled ? 'rgba(34,197,94,0.4)' : 'rgba(240,165,0,0.3)'}`,
                  }}>
                    {totpEnabled ? '✓ ENABLED' : 'NOT SET'}
                  </span>
                </div>
              </div>

              {totpStatus && (
                <div style={{
                  background: totpStatus.ok ? 'rgba(34,197,94,0.12)' : 'rgba(232,24,122,0.12)',
                  border: `1px solid ${totpStatus.ok ? 'rgba(34,197,94,0.4)' : 'rgba(232,24,122,0.4)'}`,
                  borderRadius: '8px', padding: '10px 12px', color: totpStatus.ok ? '#6ee7a0' : '#f88',
                  fontSize: '13px', marginBottom: '16px',
                }}>
                  {totpStatus.text}
                </div>
              )}

              {!totpQr && !totpEnabled && (
                <div>
                  <p style={{ color: '#aaa', fontSize: '13px', lineHeight: 1.7, marginBottom: '16px' }}>
                    Enable 2FA to add an extra layer of security. After setup, you'll need your authenticator app every time you log in.
                  </p>
                  <button onClick={setupTotp} disabled={totpLoading} style={{
                    padding: '12px 20px', borderRadius: '10px', border: 'none',
                    cursor: totpLoading ? 'not-allowed' : 'pointer',
                    background: totpLoading ? 'rgba(155,32,216,0.3)' : 'linear-gradient(90deg, #9b20d8, #e8187a)',
                    color: '#fff', fontWeight: 700, fontSize: '14px', opacity: totpLoading ? 0.7 : 1,
                  }}>
                    {totpLoading ? 'Generating...' : '🚀 Setup 2FA Now'}
                  </button>
                </div>
              )}

              {totpQr && !totpEnabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: '#fff', borderRadius: '12px', padding: '12px', display: 'inline-flex', alignSelf: 'center' }}>
                    <img
                      src={`data:image/png;base64,${totpQr}`}
                      alt="2FA QR Code"
                      style={{ width: '180px', height: '180px', display: 'block' }}
                    />
                  </div>

                  <div style={{ background: 'rgba(155,32,216,0.08)', border: '1px solid rgba(155,32,216,0.2)', borderRadius: '10px', padding: '12px' }}>
                    <p style={{ color: '#aaa', fontSize: '12px', margin: '0 0 6px' }}>Manual entry key:</p>
                    <p style={{ color: '#f0a500', fontSize: '13px', fontFamily: 'monospace', letterSpacing: '2px', margin: 0, wordBreak: 'break-all' }}>{totpSecret}</p>
                  </div>

                  <div style={{ background: 'rgba(240,165,0,0.08)', border: '1px solid rgba(240,165,0,0.25)', borderRadius: '10px', padding: '12px' }}>
                    <p style={{ color: '#f0a500', fontSize: '12px', fontWeight: 600, margin: '0 0 4px' }}>📱 How to set up:</p>
                    <ol style={{ color: '#aaa', fontSize: '12px', margin: 0, paddingLeft: '18px', lineHeight: 1.8 }}>
                      <li>Open Google Authenticator or Authy</li>
                      <li>Tap <strong>+</strong> → Scan QR code</li>
                      <li>Enter the 6-digit code below to confirm</li>
                    </ol>
                  </div>

                  <form onSubmit={enableTotp} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ color: '#aaa', fontSize: '13px' }}>Enter 6-digit code from your app:</label>
                    <input
                      type="text" inputMode="numeric" maxLength={6}
                      value={totpToken} onChange={e => setTotpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      style={{ background: '#08071a', border: '1px solid rgba(155,32,216,0.4)', borderRadius: '10px', padding: '12px 16px', color: '#fff', fontSize: '22px', fontFamily: 'monospace', letterSpacing: '8px', outline: 'none', textAlign: 'center' }}
                    />
                    <button type="submit" disabled={totpLoading || totpToken.length < 6} style={{
                      padding: '12px', borderRadius: '10px', border: 'none',
                      cursor: (totpLoading || totpToken.length < 6) ? 'not-allowed' : 'pointer',
                      background: (totpLoading || totpToken.length < 6) ? 'rgba(34,197,94,0.2)' : 'linear-gradient(90deg,#22c55e,#16a34a)',
                      color: '#fff', fontWeight: 700, fontSize: '14px',
                      opacity: (totpLoading || totpToken.length < 6) ? 0.6 : 1,
                    }}>
                      {totpLoading ? 'Verifying...' : '✓ Verify & Enable 2FA'}
                    </button>
                    <button type="button" onClick={() => { setTotpQr(null); setTotpSecret(null); setTotpToken(''); setTotpStatus(null) }}
                      style={{ background: 'none', border: 'none', color: '#8888aa', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}>
                      Cancel
                    </button>
                  </form>
                </div>
              )}

              {totpEnabled && (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>✅</div>
                  <p style={{ color: '#6ee7a0', fontWeight: 600, margin: '0 0 4px' }}>2FA is Active</p>
                  <p style={{ color: '#8888aa', fontSize: '12px', margin: 0 }}>Your account is protected with Google Authenticator.</p>
                </div>
              )}
            </div>

            {/* Security Info Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '460px' }}>
              {[
                { icon: '🔑', title: 'Email OTP on Login', desc: 'Every admin login requires email verification. A 6-digit code is sent to your registered email.', active: true },
                { icon: '📋', title: 'Activity Logging', desc: 'All admin actions are recorded with IP address and timestamp in the audit log.', active: true },
                { icon: '⏱️', title: 'Rate Limiting', desc: 'Login locked for 15 minutes after 5 failed attempts.', active: true },
              ].map(({ icon, title, desc, active }) => (
                <div key={title} style={{ background: '#100f28', border: '1px solid rgba(155,32,216,0.15)', borderRadius: '12px', padding: '14px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '22px' }}>{icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <p style={{ color: '#fff', fontWeight: 600, margin: 0, fontSize: '13px' }}>{title}</p>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: 'rgba(34,197,94,0.15)', color: '#6ee7a0', border: '1px solid rgba(34,197,94,0.3)' }}>Active</span>
                    </div>
                    <p style={{ color: '#8888aa', fontSize: '12px', margin: 0, lineHeight: 1.5 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
