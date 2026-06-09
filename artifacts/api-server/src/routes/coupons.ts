import { Router } from 'express'
import { db } from '@workspace/db'
import { businessCodesTable, usersTable, settingsTable } from '@workspace/db/schema'
import { eq } from 'drizzle-orm'
import { requireAuth, AuthRequest } from '../middlewares/auth'

const router = Router()

router.post('/validate', requireAuth, async (req: AuthRequest, res) => {
  const { code } = req.body
  if (!code?.trim()) return res.status(400).json({ valid: false, error: 'Code is required' })

  const upperCode = code.trim().toUpperCase()
  const buyerId = req.user!.id

  try {
    const [settings] = await db.select().from(settingsTable)

    // 1. Check Business Partner Code first
    const [bc] = await db.select().from(businessCodesTable).where(eq(businessCodesTable.code, upperCode))
    if (bc) {
      if (!bc.is_active) return res.status(400).json({ valid: false, error: 'This code is inactive' })
      if (bc.usage_count >= bc.usage_limit) return res.status(400).json({ valid: false, error: 'Usage limit reached' })
      if (bc.expires_at && new Date() > new Date(bc.expires_at)) return res.status(400).json({ valid: false, error: 'This code has expired' })
      return res.json({
        valid: true,
        type: 'business',
        discount_pct: bc.discount_pct,
        message: `${bc.discount_pct}% discount applied!`,
      })
    }

    // 2. Check User Partner Code (if feature is enabled)
    if (settings?.user_partner_code_enabled) {
      const [codeOwner] = await db.select({
        id: usersTable.id,
        full_name: usersTable.full_name,
        partner_code: usersTable.partner_code,
      }).from(usersTable).where(eq(usersTable.partner_code, upperCode))

      if (codeOwner) {
        if (codeOwner.id === buyerId) {
          return res.status(400).json({ valid: false, error: 'You cannot use your own partner code' })
        }
        const buyerDiscount = settings.user_partner_buyer_discount_pct
        const referrerReward = settings.user_partner_referrer_reward_pct
        return res.json({
          valid: true,
          type: 'user_partner',
          discount_pct: buyerDiscount,
          referrer_reward_pct: referrerReward,
          referrer_name: codeOwner.full_name,
          message: `${buyerDiscount}% discount! ${codeOwner.full_name} gets ${referrerReward}% reward.`,
        })
      }
    }

    return res.status(404).json({ valid: false, error: 'Invalid coupon code' })
  } catch (e) {
    return res.status(500).json({ valid: false, error: 'Validation failed' })
  }
})

export default router
