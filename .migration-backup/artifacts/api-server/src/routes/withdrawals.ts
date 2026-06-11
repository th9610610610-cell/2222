import { Router } from 'express'
import { z } from 'zod'
import { db, usersTable, notificationsTable } from '@workspace/db'
import { withdrawalsTable } from '@workspace/db/schema'
import { eq, desc, gte, and } from 'drizzle-orm'
import { requireAuth, requireAdmin, AuthRequest } from '../middlewares/auth'
import { sendOtpEmail } from '../lib/email'
import { generateOtp, storeOtp, verifyOtp, hasRecentOtp } from '../lib/otp'
import { logAdminAction } from '../lib/auditLog'
import rateLimitLib from 'express-rate-limit'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rateLimit: any = (rateLimitLib as any).default ?? rateLimitLib

const withdrawLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many withdrawal requests. Please try again later.' },
})

const withdrawSchema = z.object({
  amount: z.number().int().min(500, 'Minimum withdrawal is ৳500').max(50000, 'Maximum withdrawal is ৳50,000'),
  method: z.enum(['bkash', 'nagad', 'rocket']),
  account_number: z.string().regex(/^01[3-9]\d{8}$/, 'Invalid account number'),
})

const router = Router()

// Step 1: Request OTP for withdrawal
router.post('/request-otp', requireAuth, withdrawLimiter, async (req: AuthRequest, res) => {
  try {
    const user = req.user!
    if (!user.email) {
      return res.status(400).json({ error: 'Email required for withdrawal. Please update your profile.' })
    }

    const data = withdrawSchema.parse(req.body)
    if (user.balance < data.amount) {
      return res.status(400).json({ error: 'Insufficient balance' })
    }
    if (user.is_flagged) {
      return res.status(403).json({ error: 'Your account has been flagged. Contact support.' })
    }

    // Limit pending withdrawals
    const oneHourAgo = new Date(Date.now() - 3600000)
    const recent = await db.select({ id: withdrawalsTable.id })
      .from(withdrawalsTable)
      .where(and(eq(withdrawalsTable.user_id, user.id), gte(withdrawalsTable.created_at, oneHourAgo)))
    if (recent.length >= 3) {
      return res.status(429).json({ error: 'Too many withdrawal requests in the last hour.' })
    }

    if (hasRecentOtp(user.email, 'withdraw')) {
      return res.status(429).json({ error: 'OTP already sent. Please check your email.' })
    }

    const otp = generateOtp()
    storeOtp(user.email, 'withdraw', otp)
    await sendOtpEmail(user.email, otp, 'withdraw')

    return res.json({ message: 'OTP sent to your email. Please verify to complete withdrawal.', email: user.email })
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: err.issues[0]?.message || 'Validation error' })
    console.error('[withdrawal otp error]', err?.message || err)
    return res.status(500).json({ error: 'Failed to send OTP' })
  }
})

// Step 2: Submit withdrawal with OTP
router.post('/', requireAuth, withdrawLimiter, async (req: AuthRequest, res) => {
  try {
    const user = req.user!
    if (!user.email) return res.status(400).json({ error: 'Email required for withdrawal.' })
    if (user.is_flagged) return res.status(403).json({ error: 'Your account has been flagged. Contact support.' })

    const { amount, method, account_number, otp } = req.body
    if (!otp) return res.status(400).json({ error: 'OTP is required' })

    // Validate fields
    const data = withdrawSchema.parse({ amount: Number(amount), method, account_number })

    // Verify OTP
    const result = verifyOtp(user.email, 'withdraw', otp)
    if (!result.valid) return res.status(400).json({ error: result.error })

    // Re-check balance server-side
    const [fresh] = await db.select({ balance: usersTable.balance }).from(usersTable).where(eq(usersTable.id, user.id))
    if (!fresh || fresh.balance < data.amount) {
      return res.status(400).json({ error: 'Insufficient balance' })
    }

    // Deduct balance and create withdrawal record atomically
    await db.update(usersTable).set({ balance: fresh.balance - data.amount }).where(eq(usersTable.id, user.id))

    const [withdrawal] = await db.insert(withdrawalsTable).values({
      user_id: user.id,
      amount: data.amount,
      method: data.method,
      account_number: data.account_number,
      otp_verified: true,
    }).returning()

    await db.insert(notificationsTable).values({
      user_id: user.id,
      message: `💸 Withdrawal request of ৳${data.amount} via ${data.method} submitted. Pending admin approval.`,
    })

    return res.status(201).json({ withdrawal })
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: err.issues[0]?.message || 'Validation error' })
    console.error('[withdrawal submit error]', err?.message || err)
    return res.status(500).json({ error: 'Withdrawal submission failed' })
  }
})

// Get my withdrawals
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const withdrawals = await db.select().from(withdrawalsTable)
    .where(eq(withdrawalsTable.user_id, req.user!.id))
    .orderBy(desc(withdrawalsTable.created_at))
  res.json({ withdrawals })
})

// Admin: list all withdrawals
router.get('/admin', requireAuth, requireAdmin, async (_req, res) => {
  const withdrawals = await db.select({
    id: withdrawalsTable.id,
    user_id: withdrawalsTable.user_id,
    amount: withdrawalsTable.amount,
    method: withdrawalsTable.method,
    account_number: withdrawalsTable.account_number,
    status: withdrawalsTable.status,
    otp_verified: withdrawalsTable.otp_verified,
    created_at: withdrawalsTable.created_at,
    user: { full_name: usersTable.full_name, phone: usersTable.phone },
  }).from(withdrawalsTable)
    .leftJoin(usersTable, eq(withdrawalsTable.user_id, usersTable.id))
    .orderBy(desc(withdrawalsTable.created_at))
  res.json({ withdrawals })
})

// Admin: approve or reject withdrawal
router.patch('/admin/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const { action, rejection_reason } = req.body
  const [withdrawal] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, req.params['id'] as string))
  if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found' })
  if (withdrawal.status !== 'pending') return res.status(400).json({ error: 'Withdrawal already processed' })
  if (!withdrawal.otp_verified) return res.status(400).json({ error: 'Withdrawal was not OTP verified' })

  if (action === 'approve') {
    await db.update(withdrawalsTable).set({ status: 'approved', processed_by: req.user!.id }).where(eq(withdrawalsTable.id, withdrawal.id))
    await db.insert(notificationsTable).values({
      user_id: withdrawal.user_id,
      message: `✅ Your withdrawal of ৳${withdrawal.amount} via ${withdrawal.method} has been approved and processed.`,
    })
    await logAdminAction({ admin_id: req.user!.id, action: 'approve_withdrawal', target_type: 'withdrawal', target_id: withdrawal.id, ip: req.ip })
  } else if (action === 'reject') {
    // Refund balance
    const [user] = await db.select({ balance: usersTable.balance }).from(usersTable).where(eq(usersTable.id, withdrawal.user_id))
    if (user) await db.update(usersTable).set({ balance: user.balance + withdrawal.amount }).where(eq(usersTable.id, withdrawal.user_id))
    await db.update(withdrawalsTable).set({ status: 'rejected', rejection_reason: rejection_reason || 'Rejected by admin', processed_by: req.user!.id }).where(eq(withdrawalsTable.id, withdrawal.id))
    await db.insert(notificationsTable).values({
      user_id: withdrawal.user_id,
      message: `❌ Your withdrawal of ৳${withdrawal.amount} was rejected. Reason: ${rejection_reason || 'Invalid request'}. Amount has been refunded.`,
    })
    await logAdminAction({ admin_id: req.user!.id, action: 'reject_withdrawal', target_type: 'withdrawal', target_id: withdrawal.id, ip: req.ip })
  } else {
    return res.status(400).json({ error: 'Invalid action' })
  }

  res.json({ success: true })
})

export default router
