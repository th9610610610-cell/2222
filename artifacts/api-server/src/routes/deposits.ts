import { Router } from 'express'
import { z } from 'zod'
import { db, depositsTable, usersTable } from '@workspace/db'
import { eq, desc, gte, and } from 'drizzle-orm'
import { requireAuth, AuthRequest } from '../middlewares/auth'

const router = Router()

function calculateFraudScore(data: { senderPhone: string; trxId: string; amount: number }) {
  let score = 0; const flags: string[] = []
  if (!/^01[3-9]\d{8}$/.test(data.senderPhone)) { score += 50; flags.push('Non-BD phone number') }
  if (!/^[A-Z0-9]{8,15}$/.test(data.trxId)) { score += 30; flags.push('Suspicious TrxID format') }
  if (data.amount >= 50000) { score += 20; flags.push('Very high amount') }
  if (data.amount >= 10000 && data.amount % 1000 === 0) { score += 10; flags.push('Round high amount') }
  return { score, flags }
}

const schema = z.object({
  amount: z.number().min(250).max(10000),
  method: z.enum(['bkash', 'nagad', 'rocket']),
  sender_phone: z.string().regex(/^01[3-9]\d{8}$/, 'Invalid phone number'),
  trx_id: z.string().min(6).max(30),
})

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const deposits = await db.select().from(depositsTable).where(eq(depositsTable.user_id, req.user!.id)).orderBy(desc(depositsTable.created_at))
  res.json({ deposits })
})

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = schema.parse(req.body)
    const existing = await db.select({ id: depositsTable.id }).from(depositsTable).where(eq(depositsTable.trx_id, data.trx_id))
    if (existing.length) return res.status(400).json({ error: 'Transaction ID already used' })

    const oneHourAgo = new Date(Date.now() - 3600000)
    const recent = await db.select({ id: depositsTable.id }).from(depositsTable)
      .where(and(eq(depositsTable.user_id, req.user!.id), gte(depositsTable.created_at, oneHourAgo)))
    if (recent.length >= 5) return res.status(429).json({ error: 'Too many deposit requests. Try again later.' })

    const { score, flags } = calculateFraudScore({ senderPhone: data.sender_phone, trxId: data.trx_id, amount: data.amount })
    const [deposit] = await db.insert(depositsTable).values({
      user_id: req.user!.id, amount: data.amount, method: data.method,
      sender_phone: data.sender_phone, trx_id: data.trx_id,
      fraud_score: score, fraud_flags: flags,
    }).returning()

    if (score >= 70) await db.update(usersTable).set({ is_flagged: true }).where(eq(usersTable.id, req.user!.id))
    res.status(201).json({ deposit })
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: err.issues[0]?.message || 'Validation error' })
    res.status(500).json({ error: 'Deposit submission failed' })
  }
})

export default router
