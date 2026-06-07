import { Router } from 'express'
import { db, ticketsTable, drawsTable, usersTable, notificationsTable } from '@workspace/db'
import { eq, desc, and } from 'drizzle-orm'
import { requireAuth, AuthRequest } from '../middlewares/auth'

const router = Router()

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'

function generateTicketRef(): string {
  let ref = ''
  for (let i = 0; i < 5; i++) ref += CHARS[Math.floor(Math.random() * CHARS.length)]
  return ref
}

function generateClaimCode(): string {
  let code = ''
  for (let i = 0; i < 13; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)]
  return code
}

async function uniqueTicketRef(drawId: string): Promise<string> {
  let attempts = 0
  while (attempts < 20) {
    const ref = generateTicketRef()
    const existing = await db.select({ id: ticketsTable.id }).from(ticketsTable)
      .where(and(eq(ticketsTable.draw_id, drawId), eq(ticketsTable.ticket_ref, ref)))
    if (!existing.length) return ref
    attempts++
  }
  throw new Error('Could not generate unique ticket number')
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

  // Enforce end_date even if status is still 'live'
  if (new Date() > new Date(draw.end_date)) {
    await db.update(drawsTable).set({ status: 'ended' }).where(eq(drawsTable.id, draw_id))
    return res.status(400).json({ error: 'This draw has ended — ticket purchase is closed' })
  }

  const ticketValues: { ticket_ref: string; draw_id: string; user_id: string; claim_code: string }[] = []
  for (let i = 0; i < qty; i++) {
    const ref = await uniqueTicketRef(draw_id)
    ticketValues.push({ ticket_ref: ref, draw_id, user_id: req.user!.id, claim_code: generateClaimCode() })
  }

  const tickets = await db.insert(ticketsTable).values(ticketValues).returning()

  await db.update(usersTable).set({ balance: user.balance - totalCost, tickets_bought: user.tickets_bought + qty }).where(eq(usersTable.id, req.user!.id))
  await db.update(drawsTable).set({ tickets_sold: draw.tickets_sold + qty }).where(eq(drawsTable.id, draw_id))

  await db.insert(notificationsTable).values({
    user_id: req.user!.id,
    message: `🎟️ You purchased ${qty} ticket${qty > 1 ? 's' : ''} for draw "${draw.name}" — Total: ৳${totalCost}. Good luck! 🍀`,
  })

  res.status(201).json({ tickets })
})

export default router
