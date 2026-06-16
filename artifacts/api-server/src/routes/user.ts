import { Router } from 'express'
import { db, usersTable, notificationsTable } from '@workspace/db'
import { eq, desc } from 'drizzle-orm'
import { requireAuth, AuthRequest } from '../middlewares/auth'
import bcrypt from 'bcryptjs'
import { generateOtp, storeOtp, verifyOtp, hasRecentOtp } from '../lib/otp'
import { sendOtpEmail } from '../lib/email'

const router = Router()

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const [user] = await db.select({
    id: usersTable.id, full_name: usersTable.full_name, phone: usersTable.phone,
    email: usersTable.email, role: usersTable.role, balance: usersTable.balance,
    total_deposited: usersTable.total_deposited, total_won: usersTable.total_won,
    tickets_bought: usersTable.tickets_bought, is_flagged: usersTable.is_flagged,
    totp_enabled: usersTable.totp_enabled, created_at: usersTable.created_at,
    partner_code: usersTable.partner_code,
    referral_bonus_pct: usersTable.referral_bonus_pct,
    referral_bonus_expires: usersTable.referral_bonus_expires,
  }).from(usersTable).where(eq(usersTable.id, req.user!.id))
  res.json({ user })
})

router.patch('/me', requireAuth, async (req: AuthRequest, res) => {
  const { full_name, new_password, current_password } = req.body
  const updates: Record<string, any> = {}
  if (full_name) updates.full_name = full_name

  if (new_password) {
    if (!current_password) return res.status(400).json({ error: 'Current password is required' })
    const [existing] = await db.select({ password_hash: usersTable.password_hash })
      .from(usersTable).where(eq(usersTable.id, req.user!.id))
    const valid = await bcrypt.compare(current_password, existing.password_hash)
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' })
    updates.password_hash = await bcrypt.hash(new_password, 10)
  }

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' })

  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, req.user!.id)).returning({
    id: usersTable.id, full_name: usersTable.full_name, phone: usersTable.phone,
    email: usersTable.email, role: usersTable.role, balance: usersTable.balance,
  })
  res.json({ user })
})

// Phone verification — step 1: send OTP to email to confirm phone addition
router.post('/phone/request', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { phone } = req.body
    if (!phone) return res.status(400).json({ error: 'Phone number is required' })

    const PHONE_REGEX = /^01[3-9]\d{8}$/
    if (!PHONE_REGEX.test(phone)) {
      return res.status(400).json({ error: 'Invalid Bangladeshi phone number (e.g. 01XXXXXXXXX)' })
    }

    // Check if phone is already taken by another user
    const [existing] = await db.select({ id: usersTable.id })
      .from(usersTable).where(eq(usersTable.phone, phone))
    if (existing && existing.id !== req.user!.id) {
      return res.status(400).json({ error: 'Phone number already in use' })
    }

    const [me] = await db.select({ email: usersTable.email })
      .from(usersTable).where(eq(usersTable.id, req.user!.id))
    if (!me?.email) return res.status(400).json({ error: 'No email on file to send OTP' })

    if (await hasRecentOtp(me.email, 'phone')) {
      return res.status(429).json({ error: 'OTP already sent. Please wait 1 minute.' })
    }

    const otp = generateOtp()
    await storeOtp(me.email, 'phone', otp)
    await sendOtpEmail(me.email, otp, 'sensitive')
    return res.json({ message: 'OTP sent to your email to confirm phone update.', email: me.email })
  } catch (err: any) {
    console.error('[phone request error]', err?.message || err)
    return res.status(500).json({ error: 'Failed to send OTP' })
  }
})

// Phone verification — step 2: verify OTP and save phone
router.post('/phone/verify', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { phone, otp } = req.body
    if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP are required' })

    const [me] = await db.select({ email: usersTable.email })
      .from(usersTable).where(eq(usersTable.id, req.user!.id))
    if (!me?.email) return res.status(400).json({ error: 'User not found' })

    const result = await verifyOtp(me.email, 'phone', otp)
    if (!result.valid) return res.status(400).json({ error: result.error })

    const [existing] = await db.select({ id: usersTable.id })
      .from(usersTable).where(eq(usersTable.phone, phone))
    if (existing && existing.id !== req.user!.id) {
      return res.status(400).json({ error: 'Phone number already in use' })
    }

    const [user] = await db.update(usersTable).set({ phone })
      .where(eq(usersTable.id, req.user!.id)).returning({
        id: usersTable.id, full_name: usersTable.full_name, phone: usersTable.phone,
        email: usersTable.email, role: usersTable.role, balance: usersTable.balance,
      })
    res.json({ user, message: 'Phone number updated successfully.' })
  } catch (err: any) {
    console.error('[phone verify error]', err?.message || err)
    return res.status(500).json({ error: 'Phone verification failed' })
  }
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
