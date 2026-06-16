import { Router } from 'express'
import { db, settingsTable, usersTable, notificationsTable } from '@workspace/db'
import { eq } from 'drizzle-orm'
import { requireAuth, requireAdmin, AuthRequest } from '../middlewares/auth'

const router = Router()

const DEFAULT_SETTINGS = {
  bkash_number: '', nagad_number: '', rocket_number: '',
  whatsapp_number: '', payment_number: '', announcement: '',
  user_code_enabled: false,
  user_code_buyer_discount_pct: 15,
  user_code_owner_reward_pct: 5,
  user_code_per_draw_limit: 5,
}

router.get('/', async (_req, res) => {
  try {
    const [settings] = await db.select().from(settingsTable)
    res.json({ settings: settings || DEFAULT_SETTINGS })
  } catch (e: any) {
    console.error('[settings] GET error:', e)
    res.json({ settings: DEFAULT_SETTINGS })
  }
})

router.post('/', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const {
      bkash_number, nagad_number, rocket_number, whatsapp_number, payment_number, announcement,
      user_code_enabled, user_code_buyer_discount_pct, user_code_owner_reward_pct, user_code_per_draw_limit,
    } = req.body

    const updates: Record<string, any> = {
      bkash_number, nagad_number, rocket_number, whatsapp_number, payment_number, announcement,
    }
    if (user_code_enabled !== undefined) updates.user_code_enabled = Boolean(user_code_enabled)
    if (user_code_buyer_discount_pct !== undefined) updates.user_code_buyer_discount_pct = Number(user_code_buyer_discount_pct)
    if (user_code_owner_reward_pct !== undefined) updates.user_code_owner_reward_pct = Number(user_code_owner_reward_pct)
    if (user_code_per_draw_limit !== undefined) updates.user_code_per_draw_limit = Number(user_code_per_draw_limit)

    const [existing] = await db.select({ id: settingsTable.id, announcement: settingsTable.announcement }).from(settingsTable)

    let settings
    if (existing) {
      const [s] = await db.update(settingsTable).set(updates).where(eq(settingsTable.id, existing.id)).returning()
      settings = s

      const prevAnnouncement = existing.announcement || ''
      const newAnnouncement = announcement || ''
      if (newAnnouncement && newAnnouncement !== prevAnnouncement) {
        const allUsers = await db.select({ id: usersTable.id }).from(usersTable)
        await Promise.all(allUsers.map(u =>
          db.insert(notificationsTable).values({ user_id: u.id, message: `📢 Admin Announcement: ${newAnnouncement}`, is_pinned: true })
        ))
      }
    } else {
      const [s] = await db.insert(settingsTable).values(updates).returning()
      settings = s
      if (announcement) {
        const allUsers = await db.select({ id: usersTable.id }).from(usersTable)
        await Promise.all(allUsers.map(u =>
          db.insert(notificationsTable).values({ user_id: u.id, message: `📢 Admin Announcement: ${announcement}`, is_pinned: true })
        ))
      }
    }

    return res.json({ settings })
  } catch (e: any) {
    console.error('[settings] POST error:', e)
    return res.status(500).json({ error: e.message || 'Failed to save settings' })
  }
})

export default router
