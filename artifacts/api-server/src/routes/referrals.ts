import { Router } from 'express'
import { db } from '@workspace/db'
import { referralsTable, usersTable } from '@workspace/db/schema'
import { eq } from 'drizzle-orm'
import { requireAuth, AuthRequest } from '../middlewares/auth'

const router = Router()

router.get('/link', requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!
  const baseUrl = process.env.FRONTEND_URL || 'https://lotto-wins.vercel.app'
  const referralLink = `${baseUrl}?ref=${user.partner_code}`
  res.json({ referral_link: referralLink, partner_code: user.partner_code })
})

router.post('/register', requireAuth, async (req: AuthRequest, res) => {
  const { referrer_code } = req.body
  const referred_id = req.user!.id

  if (!referrer_code) return res.status(400).json({ error: 'referrer_code is required' })

  const existing = await db.select().from(referralsTable).where(eq(referralsTable.referred_id, referred_id))
  if (existing.length > 0) {
    return res.status(400).json({ error: 'Referral already registered for this user' })
  }

  const [referrer] = await db.select().from(usersTable).where(eq(usersTable.partner_code, referrer_code.trim().toUpperCase()))
  if (!referrer) return res.status(404).json({ error: 'Invalid referral code' })
  if (referrer.id === referred_id) return res.status(400).json({ error: 'Cannot refer yourself' })

  const [referral] = await db.insert(referralsTable).values({
    referrer_id: referrer.id,
    referred_id,
  }).returning()

  res.status(201).json({ ok: true, referral })
})

export default router
