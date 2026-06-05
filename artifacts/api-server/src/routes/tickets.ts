import { Router } from 'express'
import { db, ticketsTable, drawsTable, usersTable } from '@workspace/db'
import { eq, desc } from 'drizzle-orm'
import { requireAuth, AuthRequest } from '../middlewares/auth'

const router = Router()

function generateTicketRef(): string {
  const pool = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  let ref = 'TKT-'
  for (let i = 0; i < 6; i++) ref += pool[Math.floor(Math.random() * pool.length)]
  return ref
}

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const tickets = await db.query.ticketsTable.findMany({
    where: eq(ticketsTable.user_id, req.user!.id),
    orderBy: [desc(ticketsTable.created_at)],
    with: { draw: true },
  })
  res.json({ tickets })
})

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const { draw_id, quantity = 1 } = req.body
  const qty = Math.max(1, Math.min(20, Number(quantity)))

  const [draw] = await db.select().from(drawsTable).where(eq(drawsTable.id, draw_id))
  if (!draw) return res.status(404).json({ error: 'Draw not found' })
  if (draw.status !== 'live') return res.status(400).json({ error: 'This draw is not live' })
  if (draw.tickets_sold + qty > draw.max_tickets) return res.status(400).json({ error: 'Not enough tickets remaining' })

  const totalCost = draw.ticket_price * qty
  const [user] = await db.select({ balance: usersTable.balance, tickets_bought: usersTable.tickets_bought }).from(usersTable).where(eq(usersTable.id, req.user!.id))
  if (!user || user.balance < totalCost) return res.status(400).json({ error: 'Insufficient balance' })

  const refs: string[] = []
  for (let i = 0; i < qty; i++) {
    let ref = generateTicketRef()
    const existing = await db.select({ id: ticketsTable.id }).from(ticketsTable).where(eq(ticketsTable.ticket_ref, ref))
    if (existing.length) ref = generateTicketRef()
    refs.push(ref)
  }

  const tickets = await db.insert(ticketsTable).values(refs.map(ref => ({
    ticket_ref: ref, draw_id, user_id: req.user!.id,
  }))).returning()

  await db.update(usersTable).set({ balance: user.balance - totalCost, tickets_bought: user.tickets_bought + qty }).where(eq(usersTable.id, req.user!.id))
  await db.update(drawsTable).set({ tickets_sold: draw.tickets_sold + qty }).where(eq(drawsTable.id, draw_id))

  res.status(201).json({ tickets })
})

export default router
