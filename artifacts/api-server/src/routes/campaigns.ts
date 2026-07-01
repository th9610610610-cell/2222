import { Router } from 'express'
import { db } from '@workspace/db'
import { campaignsTable, drawsTable } from '@workspace/db/schema'
import { eq, asc } from 'drizzle-orm'
import { requireAuth, requireAdmin, AuthRequest } from '../middlewares/auth'

const router = Router()

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const { draw_id } = req.query
  if (!draw_id || typeof draw_id !== 'string') {
    return res.status(400).json({ error: 'draw_id is required' })
  }
  const campaigns = await db.select().from(campaignsTable)
    .where(eq(campaignsTable.draw_id, draw_id))
    .orderBy(asc(campaignsTable.created_at))
  res.json({ campaigns })
})

router.get('/all', requireAuth, requireAdmin, async (_req, res) => {
  const campaigns = await db.select().from(campaignsTable)
    .orderBy(asc(campaignsTable.created_at))
  res.json({ campaigns })
})

router.post('/', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const { draw_id, campaign_type, title, config } = req.body

  if (!draw_id || !campaign_type || !title) {
    return res.status(400).json({ error: 'draw_id, campaign_type, and title are required' })
  }

  const [draw] = await db.select().from(drawsTable).where(eq(drawsTable.id, draw_id))
  if (!draw) return res.status(404).json({ error: 'Draw not found' })

  const validTypes = ['partner_discount', 'free_ticket', 'unlimited_internet', 'cashback', 'giveaway', 'buy_x_get_y', 'special_offer']
  if (!validTypes.includes(campaign_type)) {
    return res.status(400).json({ error: 'Invalid campaign_type' })
  }

  let configStr = '{}'
  try {
    configStr = typeof config === 'string' ? config : JSON.stringify(config || {})
  } catch {
    configStr = '{}'
  }

  const [campaign] = await db.insert(campaignsTable).values({
    draw_id,
    campaign_type,
    title: title.trim(),
    config: configStr,
    is_active: true,
  }).returning()

  res.status(201).json({ campaign })
})

router.patch('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const id = String(req.params.id)
  const { title, config, is_active } = req.body

  const updates: Record<string, unknown> = {}
  if (title !== undefined) updates.title = title.trim()
  if (config !== undefined) {
    try {
      updates.config = typeof config === 'string' ? config : JSON.stringify(config)
    } catch {
      updates.config = '{}'
    }
  }
  if (is_active !== undefined) updates.is_active = Boolean(is_active)

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Nothing to update' })
  }

  const [updated] = await db.update(campaignsTable).set(updates).where(eq(campaignsTable.id, id)).returning()
  if (!updated) return res.status(404).json({ error: 'Campaign not found' })

  res.json({ campaign: updated })
})

router.delete('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const id = String(req.params.id)
  await db.delete(campaignsTable).where(eq(campaignsTable.id, id))
  res.json({ ok: true })
})

export default router
