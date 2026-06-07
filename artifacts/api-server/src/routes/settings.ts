import { Router } from 'express'
import { db, settingsTable } from '@workspace/db'
import { eq } from 'drizzle-orm'
import { requireAuth, requireSuperAdmin, AuthRequest } from '../middlewares/auth'

const router = Router()

router.get('/', async (_req, res) => {
  const [settings] = await db.select().from(settingsTable)
  res.json({ settings: settings || { bkash_number: '', nagad_number: '', rocket_number: '', whatsapp_number: '', payment_number: '', announcement: '' } })
})

router.post('/', requireAuth, requireSuperAdmin, async (req: AuthRequest, res) => {
  const { bkash_number, nagad_number, rocket_number, whatsapp_number, payment_number, announcement } = req.body
  const [existing] = await db.select({ id: settingsTable.id }).from(settingsTable)

  if (existing) {
    const [s] = await db.update(settingsTable).set({ bkash_number, nagad_number, rocket_number, whatsapp_number, payment_number, announcement }).where(eq(settingsTable.id, existing.id)).returning()
    return res.json({ settings: s })
  } else {
    const [s] = await db.insert(settingsTable).values({ bkash_number, nagad_number, rocket_number, whatsapp_number, payment_number, announcement }).returning()
    return res.json({ settings: s })
  }
})

export default router
