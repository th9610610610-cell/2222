import { Router } from 'express'
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import { db, usersTable } from '@workspace/db'
import { eq } from 'drizzle-orm'
import { requireAuth, AuthRequest } from '../middlewares/auth'

const router = Router()

// Generate TOTP secret and QR for admin 2FA setup
router.post('/setup', requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!
  if (!['admin', 'moderator'].includes(user.role)) {
    return res.status(403).json({ error: 'Admin 2FA only available for admin accounts' })
  }
  const secret = speakeasy.generateSecret({ name: `LottoWin (${user.phone})`, length: 32 })
  await db.update(usersTable).set({ totp_secret: secret.base32 }).where(eq(usersTable.id, user.id))
  const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url!)
  return res.json({ secret: secret.base32, qr: qrDataUrl })
})

// Confirm and enable TOTP
router.post('/enable', requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!
  if (!['admin', 'moderator'].includes(user.role)) {
    return res.status(403).json({ error: 'Admin 2FA only' })
  }
  const { token } = req.body
  if (!token) return res.status(400).json({ error: 'TOTP token required' })

  const [fresh] = await db.select({ totp_secret: usersTable.totp_secret }).from(usersTable).where(eq(usersTable.id, user.id))
  if (!fresh?.totp_secret) return res.status(400).json({ error: 'Run /totp/setup first' })

  const valid = speakeasy.totp.verify({ secret: fresh.totp_secret, encoding: 'base32', token, window: 1 })
  if (!valid) return res.status(400).json({ error: 'Invalid TOTP code' })

  await db.update(usersTable).set({ totp_enabled: true }).where(eq(usersTable.id, user.id))
  return res.json({ message: '2FA enabled successfully' })
})

// Disable TOTP
router.post('/disable', requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!
  const { token } = req.body
  const [fresh] = await db.select({ totp_secret: usersTable.totp_secret, totp_enabled: usersTable.totp_enabled }).from(usersTable).where(eq(usersTable.id, user.id))
  if (!fresh?.totp_enabled) return res.status(400).json({ error: '2FA is not enabled' })

  const valid = speakeasy.totp.verify({ secret: fresh.totp_secret!, encoding: 'base32', token, window: 1 })
  if (!valid) return res.status(400).json({ error: 'Invalid TOTP code' })

  await db.update(usersTable).set({ totp_enabled: false, totp_secret: null }).where(eq(usersTable.id, user.id))
  return res.json({ message: '2FA disabled' })
})

// Verify TOTP during sensitive action
router.post('/verify', requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!
  const { token } = req.body
  const [fresh] = await db.select({ totp_secret: usersTable.totp_secret, totp_enabled: usersTable.totp_enabled }).from(usersTable).where(eq(usersTable.id, user.id))
  if (!fresh?.totp_enabled) return res.status(400).json({ error: '2FA not enabled on this account' })

  const valid = speakeasy.totp.verify({ secret: fresh.totp_secret!, encoding: 'base32', token, window: 1 })
  if (!valid) return res.status(400).json({ error: 'Invalid 2FA code' })
  return res.json({ verified: true })
})

export default router
