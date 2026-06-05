import { Router } from 'express'
import { db, drawsTable, ticketsTable, usersTable, notificationsTable } from '@workspace/db'
import { eq, desc } from 'drizzle-orm'
import { requireAuth, requireAdmin, AuthRequest } from '../middlewares/auth'

const router = Router()

router.get('/', async (_req, res) => {
  const draws = await db.select().from(drawsTable).orderBy(desc(drawsTable.created_at))
  res.json({ draws })
})

router.post('/', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, jackpot, ticket_price, max_tickets, end_date } = req.body
    const [draw] = await db.insert(drawsTable).values({
      name, jackpot: Number(jackpot), ticket_price: Number(ticket_price),
      max_tickets: Number(max_tickets), end_date: new Date(end_date),
    }).returning()
    res.status(201).json({ draw })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:id', async (req, res) => {
  const [draw] = await db.select().from(drawsTable).where(eq(drawsTable.id, req.params.id))
  if (!draw) return res.status(404).json({ error: 'Draw not found' })
  res.json({ draw })
})

router.patch('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const { name, jackpot, ticket_price, max_tickets, end_date, status } = req.body
  const updates: Record<string, any> = {}
  if (name !== undefined) updates.name = name
  if (jackpot !== undefined) updates.jackpot = Number(jackpot)
  if (ticket_price !== undefined) updates.ticket_price = Number(ticket_price)
  if (max_tickets !== undefined) updates.max_tickets = Number(max_tickets)
  if (end_date !== undefined) updates.end_date = new Date(end_date)
  if (status !== undefined) updates.status = status
  const [draw] = await db.update(drawsTable).set(updates).where(eq(drawsTable.id, req.params.id)).returning()
  res.json({ draw })
})

router.delete('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  await db.delete(ticketsTable).where(eq(ticketsTable.draw_id, req.params.id))
  await db.delete(drawsTable).where(eq(drawsTable.id, req.params.id))
  res.json({ success: true })
})

router.post('/:id/select-winner', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const tickets = await db.select({ id: ticketsTable.id, ticket_ref: ticketsTable.ticket_ref, user_id: ticketsTable.user_id }).from(ticketsTable).where(eq(ticketsTable.draw_id, req.params.id))
  if (!tickets.length) return res.status(400).json({ error: 'No tickets for this draw' })

  const winner = tickets[Math.floor(Math.random() * tickets.length)]
  const [winnerUser] = await db.select({ full_name: usersTable.full_name }).from(usersTable).where(eq(usersTable.id, winner.user_id))

  await db.update(ticketsTable).set({ is_winner: true }).where(eq(ticketsTable.id, winner.id))
  const [draw] = await db.update(drawsTable).set({
    status: 'ended',
    winner_id: winner.user_id,
    winner_name: winnerUser?.full_name || 'Unknown',
    winner_ticket: winner.ticket_ref,
  }).where(eq(drawsTable.id, req.params.id)).returning()

  const [drawData] = await db.select({ jackpot: drawsTable.jackpot }).from(drawsTable).where(eq(drawsTable.id, req.params.id))
  const [user] = await db.select({ balance: usersTable.balance, total_won: usersTable.total_won }).from(usersTable).where(eq(usersTable.id, winner.user_id))
  if (user && drawData) {
    await db.update(usersTable).set({
      balance: user.balance + drawData.jackpot,
      total_won: user.total_won + drawData.jackpot,
    }).where(eq(usersTable.id, winner.user_id))
    await db.insert(notificationsTable).values({
      user_id: winner.user_id,
      message: `🎉 Congratulations! You won ${drawData.jackpot} BDT! Your ticket ${winner.ticket_ref} was the lucky winner.`,
    })
  }

  res.json({ draw, winner })
})

export default router
