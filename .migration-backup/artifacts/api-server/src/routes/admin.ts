import { Router } from 'express'
import { db, depositsTable, usersTable, notificationsTable } from '@workspace/db'
import { adminAuditLogsTable, loginAuditLogsTable } from '@workspace/db/schema'
import { eq, desc } from 'drizzle-orm'
import { requireAuth, requireAdmin, requireSuperAdmin, AuthRequest } from '../middlewares/auth'
import { logAdminAction } from '../lib/auditLog'

const router = Router()

router.get('/deposits', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
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
    await logAdminAction({ admin_id: req.user!.id, action: 'approve_deposit', target_type: 'deposit', target_id: depositId, ip: req.ip })
  } else if (action === 'reject') {
    await db.update(depositsTable).set({ status: 'rejected', rejection_reason: rejection_reason || 'Rejected by admin' }).where(eq(depositsTable.id, depositId))
    await db.insert(notificationsTable).values({ user_id: deposit.user_id, message: `❌ Your deposit of ৳${deposit.amount} via ${deposit.method} was rejected. Reason: ${rejection_reason || 'Invalid transaction'}` })
    await logAdminAction({ admin_id: req.user!.id, action: 'reject_deposit', target_type: 'deposit', target_id: depositId, ip: req.ip })
  } else {
    return res.status(400).json({ error: 'Invalid action' })
  }

  res.json({ success: true })
})

router.get('/users', requireAuth, requireSuperAdmin, async (_req, res) => {
  const users = await db.select({
    id: usersTable.id, full_name: usersTable.full_name, phone: usersTable.phone,
    email: usersTable.email, role: usersTable.role, balance: usersTable.balance,
    total_deposited: usersTable.total_deposited, total_won: usersTable.total_won,
    tickets_bought: usersTable.tickets_bought, is_flagged: usersTable.is_flagged,
    is_verified: usersTable.is_verified, totp_enabled: usersTable.totp_enabled,
    created_at: usersTable.created_at,
  }).from(usersTable).orderBy(desc(usersTable.created_at))
  res.json({ users })
})

router.patch('/users/:id', requireAuth, requireSuperAdmin, async (req: AuthRequest, res) => {
  const userId = req.params['id'] as string
  const { role, balance, is_flagged } = req.body
  const updates: Record<string, any> = {}
  if (role !== undefined) updates.role = role
  if (balance !== undefined) updates.balance = Number(balance)
  if (is_flagged !== undefined) updates.is_flagged = is_flagged
  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, userId)).returning()
  await logAdminAction({ admin_id: req.user!.id, action: 'update_user', target_type: 'user', target_id: userId, detail: JSON.stringify(updates), ip: req.ip })
  res.json({ user })
})

// Admin audit log
router.get('/audit-logs', requireAuth, requireSuperAdmin, async (_req, res) => {
  const logs = await db.select({
    id: adminAuditLogsTable.id,
    action: adminAuditLogsTable.action,
    target_type: adminAuditLogsTable.target_type,
    target_id: adminAuditLogsTable.target_id,
    detail: adminAuditLogsTable.detail,
    ip: adminAuditLogsTable.ip,
    created_at: adminAuditLogsTable.created_at,
    admin: { full_name: usersTable.full_name, phone: usersTable.phone },
  }).from(adminAuditLogsTable)
    .leftJoin(usersTable, eq(adminAuditLogsTable.admin_id, usersTable.id))
    .orderBy(desc(adminAuditLogsTable.created_at))
    .limit(200)
  res.json({ logs })
})

// Login audit logs
router.get('/login-logs', requireAuth, requireSuperAdmin, async (_req, res) => {
  const logs = await db.select({
    id: loginAuditLogsTable.id,
    ip: loginAuditLogsTable.ip,
    user_agent: loginAuditLogsTable.user_agent,
    success: loginAuditLogsTable.success,
    reason: loginAuditLogsTable.reason,
    created_at: loginAuditLogsTable.created_at,
    user: { full_name: usersTable.full_name, phone: usersTable.phone },
  }).from(loginAuditLogsTable)
    .leftJoin(usersTable, eq(loginAuditLogsTable.user_id, usersTable.id))
    .orderBy(desc(loginAuditLogsTable.created_at))
    .limit(200)
  res.json({ logs })
})

export default router
