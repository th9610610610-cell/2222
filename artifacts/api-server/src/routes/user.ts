import { Router } from 'express'
import { db, usersTable, notificationsTable } from '@workspace/db'
import { eq, desc } from 'drizzle-orm'
import { requireAuth, AuthRequest } from '../middlewares/auth'
import bcrypt from 'bcryptjs'

const router = Router()

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const [user] = await db.select({
    id: usersTable.id, full_name: usersTable.full_name, phone: usersTable.phone,
    role: usersTable.role, balance: usersTable.balance,
    total_deposited: usersTable.total_deposited, total_won: usersTable.total_won,
    tickets_bought: usersTable.tickets_bought, is_flagged: usersTable.is_flagged,
    created_at: usersTable.created_at,
  }).from(usersTable).where(eq(usersTable.id, req.user!.id))
  res.json({ user })
})

router.patch('/me', requireAuth, async (req: AuthRequest, res) => {
  const { full_name, phone, new_password, current_password } = req.body
  const updates: Record<string, any> = {}
  if (full_name) updates.full_name = full_name
  if (phone) updates.phone = phone

  if (new_password) {
    if (!current_password) return res.status(400).json({ error: 'Current password is required' })
    const [existing] = await db.select({ password_hash: usersTable.password_hash })
      .from(usersTable).where(eq(usersTable.id, req.user!.id))
    const valid = await bcrypt.compare(current_password, existing.password_hash)
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' })
    updates.password_hash = await bcrypt.hash(new_password, 10)
  }

  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, req.user!.id)).returning({
    id: usersTable.id, full_name: usersTable.full_name, phone: usersTable.phone, role: usersTable.role, balance: usersTable.balance,
  })
  res.json({ user })
})

router.get('/notifications', requireAuth, async (req: AuthRequest, res) => {
  const notifications = await db.select().from(notificationsTable)
    .where(eq(notificationsTable.user_id, req.user!.id))
    .orderBy(desc(notificationsTable.created_at))
    .limit(20)
  res.json({ notifications })
})

router.patch('/notifications', requireAuth, async (req: AuthRequest, res) => {
  await db.update(notificationsTable).set({ is_read: true }).where(eq(notificationsTable.user_id, req.user!.id))
  res.json({ success: true })
})

export default router
