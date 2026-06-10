import { Router } from 'express'
import { db, depositsTable, usersTable, notificationsTable, auditLogsTable } from '@workspace/db'
import { eq, desc } from 'drizzle-orm'
import { requireAuth, requireAdmin, requireSuperAdmin, AuthRequest } from '../middlewares/auth'
import { writeAudit } from '../utils/audit'

const router = Router()

function getIP(req: any): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
}

router.get('/deposits', requireAuth, requireAdmin, async (_req, res) => {
  const deposits = await db.select({
    id: depositsTable.id, user_id: depositsTable.user_id, amount: depositsTable.amount,
    method: depositsTable.method, sender_phone: depositsTable.sender_phone, trx_id: depositsTable.trx_id,
    status: depositsTable.status, rejection_reason: depositsTable.rejection_reason,
    fraud_score: depositsTable.fraud_score, fraud_flags: depositsTable.fraud_flags,
    created_at: depositsTable.created_at,
    user: { full_name: usersTable.full_name, phone: usersTable.phone },
  }).from(depositsTable)
    .leftJoin(usersTable, eq(depositsTable.user_id, usersTable.id))
    .orderBy(desc(depositsTable.created_at))
  res.json({ deposits })
})

router.patch('/deposits/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const { action, rejection_reason } = req.body
  const depositId = req.params['id'] as string
  const [deposit] = await db.select().from(depositsTable).where(eq(depositsTable.id, depositId))
  if (!deposit) return res.status(404).json({ error: 'Deposit not found' })
  if (deposit.status !== 'pending') return res.status(400).json({ error: 'Deposit already processed' })

  if (action === 'approve') {
    const [user] = await db.select({ balance: usersTable.balance, total_deposited: usersTable.total_deposited }).from(usersTable).where(eq(usersTable.id, deposit.user_id))
    if (user) {
      await db.update(usersTable).set({ balance: user.balance + deposit.amount, total_deposited: user.total_deposited + deposit.amount }).where(eq(usersTable.id, deposit.user_id))
    }
    await db.update(depositsTable).set({ status: 'approved' }).where(eq(depositsTable.id, depositId))
    await db.insert(notificationsTable).values({ user_id: deposit.user_id, message: `✅ Your deposit of ৳${deposit.amount} via ${deposit.method} has been approved! The amount has been added to your wallet.` })
    await writeAudit({ actor_id: req.user?.id, actor_role: req.user?.role, action: 'deposit.approve', target_type: 'deposit', target_id: depositId, detail: `amount=${deposit.amount} method=${deposit.method}`, ip_address: getIP(req) })
  } else if (action === 'reject') {
    await db.update(depositsTable).set({ status: 'rejected', rejection_reason: rejection_reason || 'Rejected by admin' }).where(eq(depositsTable.id, depositId))
    await db.insert(notificationsTable).values({ user_id: deposit.user_id, message: `❌ Your deposit of ৳${deposit.amount} via ${deposit.method} was rejected. Reason: ${rejection_reason || 'Invalid transaction'}` })
    await writeAudit({ actor_id: req.user?.id, actor_role: req.user?.role, action: 'deposit.reject', target_type: 'deposit', target_id: depositId, detail: `reason=${rejection_reason || 'Rejected by admin'}`, ip_address: getIP(req) })
  } else {
    return res.status(400).json({ error: 'Invalid action' })
  }

  res.json({ success: true })
})

router.get('/users', requireAuth, requireSuperAdmin, async (_req, res) => {
  const users = await db.select({
    id: usersTable.id, full_name: usersTable.full_name, phone: usersTable.phone,
    role: usersTable.role, balance: usersTable.balance, total_deposited: usersTable.total_deposited,
    total_won: usersTable.total_won, tickets_bought: usersTable.tickets_bought,
    is_flagged: usersTable.is_flagged, created_at: usersTable.created_at,
    email: usersTable.email, email_verified: usersTable.email_verified,
  }).from(usersTable).orderBy(desc(usersTable.created_at))
  res.json({ users })
})

router.patch('/users/:id', requireAuth, requireSuperAdmin, async (req: AuthRequest, res) => {
  const { role, balance, is_flagged } = req.body
  const targetId = req.params['id'] as string
  const updates: Record<string, any> = {}
  const changes: string[] = []

  if (role !== undefined) { updates.role = role; changes.push(`role=${role}`) }
  if (balance !== undefined) { updates.balance = Number(balance); changes.push(`balance=${balance}`) }
  if (is_flagged !== undefined) { updates.is_flagged = is_flagged; changes.push(`is_flagged=${is_flagged}`) }

  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, targetId)).returning()
  await writeAudit({ actor_id: req.user?.id, actor_role: req.user?.role, action: 'user.update', target_type: 'user', target_id: targetId, detail: changes.join(' '), ip_address: getIP(req) })
  res.json({ user })
})

router.get('/audit-logs', requireAuth, requireSuperAdmin, async (_req, res) => {
  const logs = await db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.created_at)).limit(500)
  res.json({ logs })
})

export default router
