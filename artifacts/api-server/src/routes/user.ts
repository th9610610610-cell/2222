import { Router } from 'express'
import { z } from 'zod'
import { db, usersTable, notificationsTable } from '@workspace/db'
import { eq, desc } from 'drizzle-orm'
import { requireAuth, AuthRequest } from '../middlewares/auth'
import bcrypt from 'bcryptjs'

const router = Router()

const strongPassword = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const [user] = await db.select({
    id: usersTable.id, full_name: usersTable.full_name, phone: usersTable.phone,
    email: usersTable.email, email_verified: usersTable.email_verified,
    role: usersTable.role, balance: usersTable.balance,
    total_deposited: usersTable.total_deposited, total_won: usersTable.total_won,
    tickets_bought: usersTable.tickets_bought, is_flagged: usersTable.is_flagged,
    partner_code: usersTable.partner_code, created_at: usersTable.created_at,
  }).from(usersTable).where(eq(usersTable.id, req.user!.id))
  res.json({ user })
})

router.patch('/me', requireAuth, async (req: AuthRequest, res) => {
  const { full_name, phone, new_password, current_password } = req.body
  const updates: Record<string, any> = {}

  if (full_name) {
    const name = String(full_name).trim()
    if (name.length < 2 || name.length > 100) return res.status(400).json({ error: 'Name must be 2-100 characters' })
    updates.full_name = name
  }
  if (phone) {
    if (!/^01[3-9]\d{8}$/.test(String(phone))) return res.status(400).json({ error: 'Invalid Bangladeshi phone number' })
    updates.phone = String(phone)
  }

  if (new_password) {
    const pwCheck = strongPassword.safeParse(new_password)
    if (!pwCheck.success) return res.status(400).json({ error: pwCheck.error.issues[0]?.message })
    if (!current_password) return res.status(400).json({ error: 'Current password is required' })
    const [existing] = await db.select({ password_hash: usersTable.password_hash })
      .from(usersTable).where(eq(usersTable.id, req.user!.id))
    const valid = await bcrypt.compare(current_password, existing.password_hash)
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' })
    updates.password_hash = await bcrypt.hash(new_password, 12)
  }

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Nothing to update' })

  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, req.user!.id)).returning({
    id: usersTable.id, full_name: usersTable.full_name, phone: usersTable.phone,
    email: usersTable.email, role: usersTable.role, balance: usersTable.balance,
  })
  res.json({ user })
})

router.get('/notifications', requireAuth, async (req: AuthRequest, res) => {
  const notifications = await db.select().from(notificationsTable)
    .where(eq(notificationsTable.user_id, req.user!.id))
    .orderBy(desc(notificationsTable.created_at))
    .limit(50)
  res.json({ notifications })
})

router.patch('/notifications', requireAuth, async (req: AuthRequest, res) => {
  await db.update(notificationsTable).set({ is_read: true }).where(eq(notificationsTable.user_id, req.user!.id))
  res.json({ success: true })
})

export default router
