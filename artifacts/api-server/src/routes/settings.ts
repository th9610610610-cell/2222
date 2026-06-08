import { Router } from 'express'
import { db, settingsTable, usersTable, notificationsTable } from '@workspace/db'
import { eq } from 'drizzle-orm'
import { requireAuth, requireAdmin, AuthRequest } from '../middlewares/auth'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const [settings] = await db.select().from(settingsTable)
    res.json({ settings: settings || { bkash_number: '', nagad_number: '', rocket_number: '', whatsapp_number: '', payment_number: '', announcement: '' } })
  } catch (e: any) {
    console.error('[settings] GET error:', e)
    res.json({ settings: { bkash_number: '', nagad_number: '', rocket_number: '', whatsapp_number: '', payment_number: '', announcement: '' } })
  }
})

router.post('/', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { bkash_number, nagad_number, rocket_number, whatsapp_number, payment_number, announcement } = req.body
    const [existing] = await db.select({ id: settingsTable.id, announcement: settingsTable.announcement }).from(settingsTable)

    let settings
    if (existing) {
      const [s] = await db.update(settingsTable)
        .set({ bkash_number, nagad_number, rocket_number, whatsapp_number, payment_number, announcement })
        .where(eq(settingsTable.id, existing.id))
        .returning()
      settings = s

      // Send announcement notification to all users if announcement changed and non-empty
      const prevAnnouncement = existing.announcement || ''
      const newAnnouncement = announcement || ''
      if (newAnnouncement && newAnnouncement !== prevAnnouncement) {
        const allUsers = await db.select({ id: usersTable.id }).from(usersTable)
        await Promise.all(allUsers.map(u =>
          db.insert(notificationsTable).values({
            user_id: u.id,
            message: `📢 Admin Announcement: ${newAnnouncement}`,
            is_pinned: true,
          })
        ))
      }
    } else {
      const [s] = await db.insert(settingsTable)
        .values({ bkash_number, nagad_number, rocket_number, whatsapp_number, payment_number, announcement })
        .returning()
      settings = s

      // New settings row — send announcement if non-empty
      if (announcement) {
        const allUsers = await db.select({ id: usersTable.id }).from(usersTable)
        await Promise.all(allUsers.map(u =>
          db.insert(notificationsTable).values({
            user_id: u.id,
            message: `📢 Admin Announcement: ${announcement}`,
            is_pinned: true,
          })
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
