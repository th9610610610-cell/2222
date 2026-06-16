import { Router } from 'express'
import { db, usersTable, settingsTable } from '@workspace/db'
import { businessCodesTable } from '@workspace/db/schema'
import { eq } from 'drizzle-orm'
import { requireAuth, AuthRequest } from '../middlewares/auth'

const router = Router()

router.post('/validate', requireAuth, async (req: AuthRequest, res) => {
  const { code, draw_id } = req.body
  if (!code?.trim()) return res.status(400).json({ error: 'Code required' })

  const upper = code.trim().toUpperCase()
  const buyerId = req.user!.id

  // Try user partner code first
  const [settings] = await db.select().from(settingsTable)
  if (settings?.user_code_enabled) {
    const [owner] = await db.select({
      id: usersTable.id, full_name: usersTable.full_name, partner_code: usersTable.partner_code,
    }).from(usersTable).where(eq(usersTable.partner_code, upper))

    if (owner) {
      if (owner.id === buyerId) {
        return res.status(400).json({ error: "You can't use your own partner code" })
      }
      return res.json({
        valid: true,
        type: 'user_partner',
        discount_pct: settings.user_code_buyer_discount_pct,
        owner_name: owner.full_name,
        per_draw_limit: settings.user_code_per_draw_limit,
        message: `✅ Partner code valid! You get ${settings.user_code_buyer_discount_pct}% off`,
      })
    }
  }

  // Try business partner code
  const [bc] = await db.select().from(businessCodesTable).where(eq(businessCodesTable.code, upper))
  if (!bc) return res.status(404).json({ error: 'Invalid code' })
  if (!bc.is_active) return res.status(400).json({ error: 'Code is inactive' })
  if (bc.usage_count >= bc.usage_limit) return res.status(400).json({ error: 'Usage limit reached' })
  if (bc.expires_at && new Date() > new Date(bc.expires_at)) return res.status(400).json({ error: 'Code has expired' })

  return res.json({
    valid: true,
    type: 'business',
    discount_pct: bc.discount_pct,
    message: `✅ Business code valid! You get ${bc.discount_pct}% off`,
  })
})

export default router
