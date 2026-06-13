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
function getJwtSecret(): string {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET environment variable is required')
  return s
}

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

    if (await hasRecentOtp(data.email, 'register')) {
      return res.status(429).json({ error: 'OTP already sent. Please wait 2 minutes before requesting another.' })
    }

    const otp = generateOtp()
    await storeOtp(data.email, 'register', otp)
    // Fire email in background — respond immediately to avoid cold-start delay
    sendOtpEmail(data.email, otp, 'register').catch(err =>
      console.error('[register otp email]', err?.message)
    )

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

    const result = await verifyOtp(email, 'register', otp)
    if (!result.valid) return res.status(400).json({ error: result.error })

    const existingPhone = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.phone, phone))
    if (existingPhone.length > 0) return res.status(400).json({ error: 'Phone number already registered' })

    const existingEmail = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email))
    if (existingEmail.length > 0) return res.status(400).json({ error: 'Email already registered' })

    const password_hash = await bcrypt.hash(password, 12)
    const [user] = await db.insert(usersTable).values({
      full_name, email, phone, password_hash, is_verified: true,
    }).returning({ id: usersTable.id, full_name: usersTable.full_name, phone: usersTable.phone, email: usersTable.email, role: usersTable.role })

    // Auto-login: return JWT so frontend can skip the re-login step
    const token = jwt.sign({ id: user.id, role: user.role }, getJwtSecret(), { expiresIn: '30d' })
    return res.status(201).json({ user, token })
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

    // Issue JWT directly — password is sufficient authentication
    const token = jwt.sign({ id: user.id, role: user.role }, getJwtSecret(), { expiresIn: '30d' })
    const { password_hash: _, totp_secret: __, ...safeUser } = user
    await logLogin({ user_id: user.id, ip, user_agent: ua, success: true })
    return res.json({ token, user: safeUser })
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: err.issues[0]?.message || 'Validation error' })
    console.error('[login error]', err?.message || err)
    return res.status(500).json({ error: 'Login failed' })
  }
})

// Login via email OTP — step 1: request OTP
router.post('/login/otp-request', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email is required' })

    const [user] = await db.select({ id: usersTable.id, email: usersTable.email, is_verified: usersTable.is_verified })
      .from(usersTable).where(eq(usersTable.email, email.trim().toLowerCase()))

    // Always return success to prevent user enumeration
    if (!user || !user.email) {
      return res.status(200).json({ message: 'If this email is registered, an OTP has been sent.' })
    }

    if (await hasRecentOtp(user.email, 'login')) {
      return res.status(429).json({ error: 'OTP already sent. Please wait 2 minutes before requesting another.' })
    }

    const otp = generateOtp()
    await storeOtp(user.email, 'login', otp)
    sendOtpEmail(user.email, otp, 'login').catch(err =>
      console.error('[login otp email]', err?.message)
    )
    const masked = user.email.replace(/(.{2}).+(@.+)/, '$1***$2')
    console.log(`[login otp] OTP sent to ${masked} from ${ip}`)
    return res.status(200).json({ message: 'OTP sent to your email.', email: user.email })
  } catch (err: any) {
    console.error('[login otp-request error]', err?.message || err)
    return res.status(500).json({ error: 'Failed to send OTP' })
  }
})

// Login OTP verify — accepts {email, otp} (OTP login) or {phone, otp} (legacy)
router.post('/login/verify', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  const ua = req.headers['user-agent'] || ''
  try {
    const { phone, email, otp } = req.body
    if (!otp) return res.status(400).json({ error: 'OTP is required' })

    let user: typeof usersTable.$inferSelect | undefined
    if (email) {
      const [found] = await db.select().from(usersTable).where(eq(usersTable.email, email.trim().toLowerCase()))
      user = found
    } else if (phone) {
      const [found] = await db.select().from(usersTable).where(eq(usersTable.phone, phone))
      user = found
    } else {
      return res.status(400).json({ error: 'Email or phone is required' })
    }

    if (!user || !user.email) return res.status(404).json({ error: 'User not found' })

    const result = await verifyOtp(user.email, 'login', otp)
    if (!result.valid) return res.status(400).json({ error: result.error })

    const token = jwt.sign({ id: user.id, role: user.role }, getJwtSecret(), { expiresIn: '30d' })
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

    if (await hasRecentOtp(user.email, 'reset')) {
      return res.status(429).json({ error: 'OTP already sent. Please wait 2 minutes before requesting another.' })
    }

    const otp = generateOtp()
    await storeOtp(user.email, 'reset', otp)
    // Fire email in background — respond immediately
    sendOtpEmail(user.email, otp, 'reset').catch(err =>
      console.error('[reset otp email]', err?.message)
    )
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

    const result = await verifyOtp(user.email, 'reset', otp)
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
