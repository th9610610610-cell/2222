import { Router } from 'express'
import { db, settingsTable, usersTable, notificationsTable } from '@workspace/db'
import { eq } from 'drizzle-orm'
import { requireAuth, requireAdmin, AuthRequest } from '../middlewares/auth'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const [settings] = await db.select().from(settingsTable)
    res.json({
      settings: settings || {
        bkash_number: '', nagad_number: '', rocket_number: '',
        whatsapp_number: '', payment_number: '', announcement: '',
        user_partner_code_enabled: false,
        user_partner_buyer_discount_pct: 10,
        user_partner_referrer_reward_pct: 10,
      },
    })
  } catch (e: any) {
    console.error('[settings] GET error:', e)
    res.json({
      settings: {
        bkash_number: '', nagad_number: '', rocket_number: '',
        whatsapp_number: '', payment_number: '', announcement: '',
        user_partner_code_enabled: false,
        user_partner_buyer_discount_pct: 10,
        user_partner_referrer_reward_pct: 10,
      },
    })
  }
})

router.post('/', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const {
      bkash_number, nagad_number, rocket_number, whatsapp_number, payment_number,
      announcement, user_partner_code_enabled, user_partner_buyer_discount_pct,
      user_partner_referrer_reward_pct,
    } = req.body

    const [existing] = await db.select({
      id: settingsTable.id,
      announcement: settingsTable.announcement,
    }).from(settingsTable)

    const values = {
      bkash_number: bkash_number ?? '',
      nagad_number: nagad_number ?? '',
      rocket_number: rocket_number ?? '',
      whatsapp_number: whatsapp_number ?? '',
      payment_number: payment_number ?? '',
      announcement: announcement ?? '',
      user_partner_code_enabled: Boolean(user_partner_code_enabled),
      user_partner_buyer_discount_pct: Number(user_partner_buyer_discount_pct ?? 10),
      user_partner_referrer_reward_pct: Number(user_partner_referrer_reward_pct ?? 10),
    }

    let settings
    if (existing) {
      const [s] = await db.update(settingsTable)
        .set(values)
        .where(eq(settingsTable.id, existing.id))
        .returning()
      settings = s

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
      const [s] = await db.insert(settingsTable).values(values).returning()
      settings = s

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
