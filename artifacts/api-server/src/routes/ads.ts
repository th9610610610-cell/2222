import { Router } from 'express'
import { db } from '@workspace/db'
import { adsTable } from '@workspace/db'
import { eq, asc } from 'drizzle-orm'
import { requireAuth, requireAdmin, AuthRequest } from '../middlewares/auth'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const ads = await db.select().from(adsTable)
      .where(eq(adsTable.is_active, true))
      .orderBy(asc(adsTable.display_order), asc(adsTable.created_at))
    res.json({ ads })
  } catch (e: any) {
    res.json({ ads: [] })
  }
})

router.get('/all', requireAuth, requireAdmin, async (_req, res) => {
  const ads = await db.select().from(adsTable).orderBy(asc(adsTable.display_order), asc(adsTable.created_at))
  res.json({ ads })
})

router.post('/', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const { type, title, content, link_url, display_order } = req.body
  if (!content) return res.status(400).json({ error: 'Content is required' })
  const [ad] = await db.insert(adsTable).values({
    type: type || 'text',
    title: title || '',
    content,
    link_url: link_url || '',
    display_order: Number(display_order) || 0,
    is_active: true,
  }).returning()
  res.status(201).json({ ad })
})

router.patch('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const { is_active, display_order, title, content, link_url } = req.body
  const updates: Record<string, any> = {}
  if (is_active !== undefined) updates.is_active = is_active
  if (display_order !== undefined) updates.display_order = Number(display_order)
  if (title !== undefined) updates.title = title
  if (content !== undefined) updates.content = content
  if (link_url !== undefined) updates.link_url = link_url
  const [ad] = await db.update(adsTable).set(updates).where(eq(adsTable.id, req.params['id'] as string)).returning()
  res.json({ ad })
})

router.delete('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  await db.delete(adsTable).where(eq(adsTable.id, req.params['id'] as string))
  res.json({ success: true })
})

export default router
