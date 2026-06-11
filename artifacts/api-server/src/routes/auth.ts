import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { db } from '@workspace/db'
import { usersTable } from '@workspace/db'
import { eq } from 'drizzle-orm'
import { sendOtpEmail } from '../lib/email'
import { generateOtp, storeOtp, verifyOtp, hasRecentOtp } from '../lib/otp'
import { logLogin } from '../lib/auditLog'

const router = Router()
if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET environment variable is required')
const JWT_SECRET = process.env.JWT_SECRET as string

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#])[A-Za-z\d@$!%*?&_\-#]{8,}$/

const registerSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^01[3-9]\d{8}$/, 'Invalid Bangladeshi phone number'),
  password: z.string().regex(
    PASSWORD_REGEX,
    'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
  ),
})

const loginSchema = z.object({
  phone: z.string(),
  password: z.string(),
})

// Step 1: Register — validate and send OTP
router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body)

    const existingPhone = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.phone, data.phone))
    if (existingPhone.length > 0) return res.status(400).json({ error: 'Phone number already registered' })

    const existingEmail = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, data.email))
    if (existingEmail.length > 0) return res.status(400).json({ error: 'Email already registered' })

    if (hasRecentOtp(data.email, 'register')) {
      return res.status(429).json({ error: 'OTP already sent. Please wait before requesting another.' })
    }

    const otp = generateOtp()
    storeOtp(data.email, 'register', otp)
    await sendOtpEmail(data.email, otp, 'register')

    return res.status(200).json({ message: 'OTP sent to your email. Please verify to complete registration.', email: data.email })
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: err.issues[0]?.message || 'Validation error' })
    console.error('[register error]', err?.message || err)
    return res.status(500).json({ error: 'Registration failed' })
  }
})

// Step 2: Verify OTP and create account
router.post('/register/verify', async (req, res) => {
  try {
    const { full_name, email, phone, password, otp } = req.body
    if (!full_name || !email || !phone || !password || !otp) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    const result = verifyOtp(email, 'register', otp)
    if (!result.valid) return res.status(400).json({ error: result.error })

    const existingPhone = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.phone, phone))
    if (existingPhone.length > 0) return res.status(400).json({ error: 'Phone number already registered' })

    const existingEmail = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email))
    if (existingEmail.length > 0) return res.status(400).json({ error: 'Email already registered' })

    const password_hash = await bcrypt.hash(password, 12)
    const [user] = await db.insert(usersTable).values({
      full_name, email, phone, password_hash, is_verified: true,
    }).returning({ id: usersTable.id, full_name: usersTable.full_name, phone: usersTable.phone, email: usersTable.email, role: usersTable.role })

    return res.status(201).json({ user })
  } catch (err: any) {
    console.error('[register verify error]', err?.message || err)
    return res.status(500).json({ error: 'Verification failed' })
  }
})

// Login — check credentials, lock after failures, send OTP if new device
router.post('/login', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  const ua = req.headers['user-agent'] || ''
  try {
    const { phone, password } = loginSchema.parse(req.body)

    const [user] = await db.select().from(usersTable).where(eq(usersTable.phone, phone))
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Check account lock
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remaining = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000)
      return res.status(423).json({ error: `Account temporarily locked. Try again in ${remaining} minute(s).` })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      const attempts = (user.failed_login_attempts || 0) + 1
      const lockUpdates: Record<string, any> = { failed_login_attempts: attempts }
      if (attempts >= 5) {
        lockUpdates.locked_until = new Date(Date.now() + 15 * 60 * 1000)
      }
      await db.update(usersTable).set(lockUpdates).where(eq(usersTable.id, user.id))
      await logLogin({ user_id: user.id, ip, user_agent: ua, success: false, reason: 'wrong_password' })
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Reset failed attempts on success
    await db.update(usersTable).set({ failed_login_attempts: 0, locked_until: null }).where(eq(usersTable.id, user.id))

    // If user has email, require OTP for login (new device verification)
    if (user.email) {
      if (hasRecentOtp(user.email, 'login')) {
        return res.status(200).json({ requireOtp: true, email: user.email, message: 'OTP already sent to your email.' })
      }
      const otp = generateOtp()
      storeOtp(user.email, 'login', otp)
      await sendOtpEmail(user.email, otp, 'login')
      await logLogin({ user_id: user.id, ip, user_agent: ua, success: false, reason: 'otp_pending' })
      return res.status(200).json({ requireOtp: true, email: user.email, message: 'OTP sent to your email.' })
    }

    // No email — legacy login (direct token)
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' })
    const { password_hash: _, totp_secret: __, ...safeUser } = user
    await logLogin({ user_id: user.id, ip, user_agent: ua, success: true })
    return res.json({ token, user: safeUser })
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: err.issues[0]?.message || 'Validation error' })
    console.error('[login error]', err?.message || err)
    return res.status(500).json({ error: 'Login failed' })
  }
})

// Login OTP verify
router.post('/login/verify', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  const ua = req.headers['user-agent'] || ''
  try {
    const { phone, otp } = req.body
    if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' })

    const [user] = await db.select().from(usersTable).where(eq(usersTable.phone, phone))
    if (!user || !user.email) return res.status(404).json({ error: 'User not found' })

    const result = verifyOtp(user.email, 'login', otp)
    if (!result.valid) return res.status(400).json({ error: result.error })

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' })
    const { password_hash: _, totp_secret: __, ...safeUser } = user
    await logLogin({ user_id: user.id, ip, user_agent: ua, success: true })
    return res.json({ token, user: safeUser })
  } catch (err: any) {
    console.error('[login verify error]', err?.message || err)
    return res.status(500).json({ error: 'Verification failed' })
  }
})

// Password reset — request OTP
router.post('/reset-password/request', async (req, res) => {
  try {
    const { phone } = req.body
    if (!phone) return res.status(400).json({ error: 'Phone number required' })

    const [user] = await db.select({ id: usersTable.id, email: usersTable.email }).from(usersTable).where(eq(usersTable.phone, phone))
    // Always return success to prevent user enumeration
    if (!user || !user.email) return res.status(200).json({ message: 'If this account exists, a reset OTP has been sent.' })

    if (hasRecentOtp(user.email, 'reset')) {
      return res.status(429).json({ error: 'OTP already sent. Please wait before requesting another.' })
    }

    const otp = generateOtp()
    storeOtp(user.email, 'reset', otp)
    await sendOtpEmail(user.email, otp, 'reset')
    return res.status(200).json({ message: 'If this account exists, a reset OTP has been sent.', email: user.email })
  } catch (err: any) {
    console.error('[reset request error]', err?.message || err)
    return res.status(500).json({ error: 'Reset request failed' })
  }
})

// Password reset — verify OTP and set new password
router.post('/reset-password/confirm', async (req, res) => {
  try {
    const { phone, otp, new_password } = req.body
    if (!phone || !otp || !new_password) return res.status(400).json({ error: 'All fields required' })

    if (!PASSWORD_REGEX.test(new_password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character' })
    }

    const [user] = await db.select({ id: usersTable.id, email: usersTable.email }).from(usersTable).where(eq(usersTable.phone, phone))
    if (!user || !user.email) return res.status(404).json({ error: 'User not found' })

    const result = verifyOtp(user.email, 'reset', otp)
    if (!result.valid) return res.status(400).json({ error: result.error })

    const password_hash = await bcrypt.hash(new_password, 12)
    await db.update(usersTable).set({ password_hash, failed_login_attempts: 0, locked_until: null }).where(eq(usersTable.id, user.id))

    return res.json({ message: 'Password reset successful' })
  } catch (err: any) {
    console.error('[reset confirm error]', err?.message || err)
    return res.status(500).json({ error: 'Password reset failed' })
  }
})

export default router
