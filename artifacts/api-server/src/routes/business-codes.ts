import { Router } from 'express'
import { db } from '@workspace/db'
import { businessCodesTable } from '@workspace/db/schema'
import { eq } from 'drizzle-orm'
import { requireAuth, requireAdmin, AuthRequest } from '../middlewares/auth'

const router = Router()

// Admin: list all codes
router.get('/', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const codes = await db.select().from(businessCodesTable).orderBy(businessCodesTable.created_at)
    res.json({ codes })
  } catch (e) {
    res.status(500).json({ error: 'Failed to load codes' })
  }
})

// Admin: create code
router.post('/', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const { code, discount_pct = 50, usage_limit = 100, expires_at, description = '' } = req.body
  if (!code?.trim()) return res.status(400).json({ error: 'Code is required' })
  try {
    const [created] = await db.insert(businessCodesTable).values({
      code: code.trim().toUpperCase(),
      discount_pct: Number(discount_pct),
      usage_limit: Number(usage_limit),
      expires_at: expires_at ? new Date(expires_at) : null,
      description,
    }).returning()
    res.status(201).json({ code: created })
  } catch (e: any) {
    if (e.code === '23505') return res.status(409).json({ error: 'Code already exists' })
    res.status(500).json({ error: 'Failed to create code' })
  }
})

// Admin: toggle active / update
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = String(req.params.id)
  const { is_active, usage_limit, discount_pct, expires_at, description } = req.body
  const updates: any = {}
  if (is_active !== undefined) updates.is_active = is_active
  if (usage_limit !== undefined) updates.usage_limit = Number(usage_limit)
  if (discount_pct !== undefined) updates.discount_pct = Number(discount_pct)
  if (expires_at !== undefined) updates.expires_at = expires_at ? new Date(expires_at) : null
  if (description !== undefined) updates.description = description
  await db.update(businessCodesTable).set(updates).where(eq(businessCodesTable.id, id))
  res.json({ ok: true })
})

// Admin: delete code
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  await db.delete(businessCodesTable).where(eq(businessCodesTable.id, String(req.params.id)))
  res.json({ ok: true })
})

// Public: validate code (used before purchase)
router.post('/validate', requireAuth, async (req, res) => {
  const { code } = req.body
  if (!code?.trim()) return res.status(400).json({ error: 'Code required' })
  const [bc] = await db.select().from(businessCodesTable).where(eq(businessCodesTable.code, code.trim().toUpperCase()))
  if (!bc) return res.status(404).json({ error: 'Invalid code' })
  if (!bc.is_active) return res.status(400).json({ error: 'Code is inactive' })
  if (bc.usage_count >= bc.usage_limit) return res.status(400).json({ error: 'Usage limit reached' })
  if (bc.expires_at && new Date() > new Date(bc.expires_at)) return res.status(400).json({ error: 'Code has expired' })
  res.json({ valid: true, discount_pct: bc.discount_pct, code: bc.code })
})

export default router
