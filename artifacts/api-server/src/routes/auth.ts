import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { db } from '@workspace/db'
import { usersTable, knownDevicesTable } from '@workspace/db'
import { eq, or } from 'drizzle-orm'
import { sendOTPEmail } from '../utils/email'
import { storeOTP, verifyOTP, hashDevice } from '../utils/otp'
import { requireAuth } from '../middlewares/auth'

const router = Router()
if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET environment variable is required')
const JWT_SECRET = process.env.JWT_SECRET as string
const LOCKOUT_ATTEMPTS = 5
const LOCKOUT_MINUTES = 30

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'
function generatePartnerCode(): string {
  let code = ''
  for (let i = 0; i < 7; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)]
  return code
}
async function uniquePartnerCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generatePartnerCode()
    const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.partner_code, code))
    if (!existing.length) return code
  }
  throw new Error('Could not generate unique partner code')
}

function getIP(req: any): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
}

const strongPassword = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

const registerSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^01[3-9]\d{8}$/, 'Invalid Bangladeshi phone number'),
  email: z.string().email('Invalid email address'),
  password: strongPassword,
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  device_ua: z.string().optional(),
})

// POST /api/auth/register — Step 1: collect info, send OTP
router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body)
    const emailLower = data.email.toLowerCase()

    const existing = await db.select({ id: usersTable.id }).from(usersTable).where(
      or(eq(usersTable.phone, data.phone), eq(usersTable.email, emailLower))
    )
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Phone or email already registered' })
    }

    const otp = await storeOTP(emailLower, 'email_verify', getIP(req))
    const sent = await sendOTPEmail(emailLower, otp, 'email_verify')
    if (!sent) return res.status(500).json({ error: 'Failed to send verification email' })

    return res.json({ pending: true, email: emailLower, message: 'OTP sent to your email. Check spam if not received.' })
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: err.issues[0]?.message || 'Validation error' })
    console.error('[register error]', err?.message || err)
    return res.status(500).json({ error: 'Registration failed' })
  }
})

// POST /api/auth/verify-email — Step 2: verify OTP, create account
router.post('/verify-email', async (req, res) => {
  try {
    const { email, code, full_name, phone, password } = req.body
    if (!email || !code || !full_name || !phone || !password) {
      return res.status(400).json({ error: 'All fields required' })
    }
    const emailLower = email.toLowerCase()
    const valid = await verifyOTP(emailLower, code, 'email_verify')
    if (!valid) return res.status(400).json({ error: 'Invalid or expired OTP' })

    const existing = await db.select({ id: usersTable.id }).from(usersTable).where(
      or(eq(usersTable.phone, phone), eq(usersTable.email, emailLower))
    )
    if (existing.length > 0) return res.status(400).json({ error: 'Phone or email already registered' })

    const strongPwd = strongPassword.safeParse(password)
    if (!strongPwd.success) return res.status(400).json({ error: strongPwd.error.issues[0]?.message })

    const password_hash = await bcrypt.hash(password, 12)
    const partner_code = await uniquePartnerCode()
    const [user] = await db.insert(usersTable).values({
      full_name, phone, email: emailLower, email_verified: true, password_hash, partner_code,
    }).returning({ id: usersTable.id, full_name: usersTable.full_name, phone: usersTable.phone, email: usersTable.email, role: usersTable.role, partner_code: usersTable.partner_code })

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' })
    const ua = req.headers['user-agent'] || ''
    const dh = hashDevice(ua, getIP(req))
    await db.insert(knownDevicesTable).values({ user_id: user.id, device_hash: dh, user_agent: ua }).catch(() => {})

    return res.status(201).json({ token, user })
  } catch (err: any) {
    console.error('[verify-email error]', err?.message || err)
    return res.status(500).json({ error: 'Verification failed' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body)
    const emailLower = data.email.toLowerCase()
    const ua = data.device_ua || req.headers['user-agent'] || ''
    const ip = getIP(req)

    const [user] = await db.select().from(usersTable).where(
      or(eq(usersTable.email, emailLower), eq(usersTable.phone, emailLower))
    )
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    // Lockout check
    if (user.lockout_until && new Date() < new Date(user.lockout_until)) {
      const mins = Math.ceil((new Date(user.lockout_until).getTime() - Date.now()) / 60000)
      return res.status(429).json({ error: `Account locked. Try again in ${mins} minute${mins === 1 ? '' : 's'}.` })
    }

    const valid = await bcrypt.compare(data.password, user.password_hash)
    if (!valid) {
      const attempts = (user.login_attempts || 0) + 1
      const lockout_until = attempts >= LOCKOUT_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null
      await db.update(usersTable).set({ login_attempts: attempts, ...(lockout_until ? { lockout_until } : {}) }).where(eq(usersTable.id, user.id))
      const remaining = LOCKOUT_ATTEMPTS - attempts
      if (lockout_until) return res.status(429).json({ error: `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.` })
      return res.status(401).json({ error: `Invalid credentials. ${remaining > 0 ? `${remaining} attempt${remaining === 1 ? '' : 's'} remaining before lockout.` : ''}` })
    }

    // Reset attempts on success
    await db.update(usersTable).set({ login_attempts: 0, lockout_until: null }).where(eq(usersTable.id, user.id))

    // Backfill partner code
    if (!user.partner_code) {
      try {
        const code = await uniquePartnerCode()
        await db.update(usersTable).set({ partner_code: code }).where(eq(usersTable.id, user.id))
        user.partner_code = code
      } catch (_) {}
    }

    // Device check
    const dh = hashDevice(ua, ip)
    const [known] = await db.select().from(knownDevicesTable).where(
      eq(knownDevicesTable.user_id, user.id)
    ).then(rows => rows.filter(r => r.device_hash === dh))

    if (!known && user.email) {
      // New device — send OTP, require verification
      const otp = await storeOTP(user.email, 'new_device', ip)
      await sendOTPEmail(user.email, otp, 'new_device')
      return res.json({ new_device: true, email: user.email, message: 'New device detected. OTP sent to your email.' })
    }

    // Update last seen
    if (known) {
      await db.update(knownDevicesTable).set({ last_seen: new Date() }).where(eq(knownDevicesTable.id, known.id))
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' })
    const { password_hash: _, login_attempts: __, lockout_until: ___, ...safeUser } = user
    return res.json({ token, user: safeUser })
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: err.issues[0]?.message || 'Validation error' })
    console.error('[login error]', err?.message || err)
    return res.status(500).json({ error: 'Login failed' })
  }
})

// POST /api/auth/verify-device — confirm new device OTP
router.post('/verify-device', async (req, res) => {
  try {
    const { email, code, device_ua } = req.body
    if (!email || !code) return res.status(400).json({ error: 'Email and code required' })
    const emailLower = email.toLowerCase()
    const valid = await verifyOTP(emailLower, code, 'new_device')
    if (!valid) return res.status(400).json({ error: 'Invalid or expired OTP' })

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, emailLower))
    if (!user) return res.status(404).json({ error: 'User not found' })

    const ua = device_ua || req.headers['user-agent'] || ''
    const ip = getIP(req)
    const dh = hashDevice(ua, ip)
    await db.insert(knownDevicesTable).values({ user_id: user.id, device_hash: dh, user_agent: ua }).catch(() => {})

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' })
    const { password_hash: _, login_attempts: __, lockout_until: ___, ...safeUser } = user
    return res.json({ token, user: safeUser })
  } catch (err: any) {
    console.error('[verify-device error]', err?.message || err)
    return res.status(500).json({ error: 'Device verification failed' })
  }
})

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email required' })
    const emailLower = email.toLowerCase()
    const [user] = await db.select({ id: usersTable.id, email: usersTable.email }).from(usersTable).where(eq(usersTable.email, emailLower))
    // Always return success to prevent email enumeration
    if (user?.email) {
      const otp = await storeOTP(emailLower, 'password_reset', getIP(req))
      await sendOTPEmail(emailLower, otp, 'password_reset')
    }
    return res.json({ sent: true, message: 'If this email exists, an OTP has been sent.' })
  } catch (err: any) {
    console.error('[forgot-password error]', err?.message || err)
    return res.status(500).json({ error: 'Failed to process request' })
  }
})

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, new_password } = req.body
    if (!email || !code || !new_password) return res.status(400).json({ error: 'All fields required' })
    const emailLower = email.toLowerCase()

    const strongPwd = strongPassword.safeParse(new_password)
    if (!strongPwd.success) return res.status(400).json({ error: strongPwd.error.issues[0]?.message })

    const valid = await verifyOTP(emailLower, code, 'password_reset')
    if (!valid) return res.status(400).json({ error: 'Invalid or expired OTP' })

    const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, emailLower))
    if (!user) return res.status(404).json({ error: 'Account not found' })

    const password_hash = await bcrypt.hash(new_password, 12)
    await db.update(usersTable).set({ password_hash, login_attempts: 0, lockout_until: null }).where(eq(usersTable.id, user.id))
    return res.json({ success: true, message: 'Password reset successfully. Please log in.' })
  } catch (err: any) {
    console.error('[reset-password error]', err?.message || err)
    return res.status(500).json({ error: 'Password reset failed' })
  }
})

// POST /api/auth/send-otp — for sensitive actions (authenticated)
router.post('/send-otp', requireAuth as any, async (req: any, res) => {
  try {
    const user = req.user
    if (!user.email) return res.status(400).json({ error: 'No email on account. Contact support.' })
    const { type } = req.body
    const allowed = ['withdraw']
    if (!allowed.includes(type)) return res.status(400).json({ error: 'Invalid OTP type' })
    const otp = await storeOTP(user.email, type, getIP(req))
    await sendOTPEmail(user.email, otp, type)
    return res.json({ sent: true, email: user.email })
  } catch (err: any) {
    console.error('[send-otp error]', err?.message || err)
    return res.status(500).json({ error: 'Failed to send OTP' })
  }
})

// POST /api/auth/verify-action-otp — verify OTP for sensitive action (authenticated)
router.post('/verify-action-otp', requireAuth as any, async (req: any, res) => {
  try {
    const user = req.user
    if (!user.email) return res.status(400).json({ error: 'No email on account' })
    const { code, type } = req.body
    if (!code || !type) return res.status(400).json({ error: 'Code and type required' })
    const valid = await verifyOTP(user.email, code, type)
    if (!valid) return res.status(400).json({ error: 'Invalid or expired OTP' })
    return res.json({ verified: true })
  } catch (err: any) {
    console.error('[verify-action-otp error]', err?.message || err)
    return res.status(500).json({ error: 'Verification failed' })
  }
})

export default router
