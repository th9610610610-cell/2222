import { Router } from 'express'
import { db, drawsTable, ticketsTable, usersTable, notificationsTable } from '@workspace/db'
import { eq, desc, and, lt } from 'drizzle-orm'
import { requireAuth, requireAdmin, AuthRequest } from '../middlewares/auth'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    await db.update(drawsTable)
      .set({ status: 'ended' })
      .where(and(eq(drawsTable.status, 'live'), lt(drawsTable.end_date, new Date())))
    const draws = await db.select().from(drawsTable).orderBy(desc(drawsTable.created_at))
    res.json({ draws })
  } catch (e: any) {
    res.json({ draws: [] })
  }
})

router.post('/', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, jackpot, ticket_price, max_tickets, end_date } = req.body
    const existing = await db.select({ draw_number: drawsTable.draw_number }).from(drawsTable)
    const maxNum = existing.reduce((max, d) => Math.max(max, d.draw_number ?? 0), 0)
    const [draw] = await db.insert(drawsTable).values({
      name, jackpot: Number(jackpot), ticket_price: Number(ticket_price),
      max_tickets: Number(max_tickets), end_date: new Date(end_date),
      draw_number: maxNum + 1,
    }).returning()
    res.status(201).json({ draw })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const [draw] = await db.select().from(drawsTable).where(eq(drawsTable.id, req.params['id'] as string))
    if (!draw) return res.status(404).json({ error: 'Draw not found' })
    res.json({ draw })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.patch('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, jackpot, ticket_price, max_tickets, end_date, status } = req.body
    const updates: Record<string, any> = {}
    if (name !== undefined) updates.name = name
    if (jackpot !== undefined) updates.jackpot = Number(jackpot)
    if (ticket_price !== undefined) updates.ticket_price = Number(ticket_price)
    if (max_tickets !== undefined) updates.max_tickets = Number(max_tickets)
    if (end_date !== undefined) updates.end_date = new Date(end_date)
    if (status !== undefined) updates.status = status

    const [prevDraw] = await db.select().from(drawsTable).where(eq(drawsTable.id, req.params['id'] as string))
    const [draw] = await db.update(drawsTable).set(updates).where(eq(drawsTable.id, req.params['id'] as string)).returning()

    // Send notifications on status change
    if (status && prevDraw && prevDraw.status !== status) {
      let notifMsg = ''
      let notifAllUsers = false

      if (status === 'live') {
        notifMsg = `🔴 Draw "${draw.name}" is now LIVE! Buy your tickets now before it ends! 🎟️`
        notifAllUsers = true
      } else if (status === 'upcoming') {
        notifMsg = `📅 New Draw "${draw.name}" is coming soon! Get ready — jackpot: ৳${draw.jackpot.toLocaleString()}!`
        notifAllUsers = true
      } else if (status === 'rescheduled') {
        notifMsg = `🔄 Draw "${draw.name}" has been rescheduled. Stay tuned for the new schedule.`
        notifAllUsers = true
      } else if (status === 'ended') {
        notifMsg = `🏁 Draw "${draw.name}" has ended. Stay tuned for the winner announcement!`
        notifAllUsers = false // only ticket holders
      }

      if (notifMsg) {
        if (notifAllUsers) {
          // Notify ALL users
          const allUsers = await db.select({ id: usersTable.id }).from(usersTable)
          if (allUsers.length > 0) {
            await Promise.all(allUsers.map(u =>
              db.insert(notificationsTable).values({ user_id: u.id, message: notifMsg })
            ))
          }
        } else {
          // Notify only ticket holders
          const tickets = await db.select({ user_id: ticketsTable.user_id })
            .from(ticketsTable)
            .where(eq(ticketsTable.draw_id, req.params['id'] as string))
          const uniqueUsers = [...new Set(tickets.map(t => t.user_id))]
          if (uniqueUsers.length > 0) {
            await Promise.all(uniqueUsers.map(uid =>
              db.insert(notificationsTable).values({ user_id: uid, message: notifMsg })
            ))
          }
        }
      }
    }

    res.json({ draw })
  } catch (err: any) {
    console.error('[draws] PATCH error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    await db.delete(ticketsTable).where(eq(ticketsTable.draw_id, req.params['id'] as string))
    await db.delete(drawsTable).where(eq(drawsTable.id, req.params['id'] as string))
    res.json({ success: true })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/:id/select-winner', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const tickets = await db.select({ id: ticketsTable.id, ticket_ref: ticketsTable.ticket_ref, user_id: ticketsTable.user_id })
      .from(ticketsTable).where(eq(ticketsTable.draw_id, req.params['id'] as string))
    if (!tickets.length) return res.status(400).json({ error: 'No tickets for this draw' })

    const winner = tickets[Math.floor(Math.random() * tickets.length)]
    const [winnerUser] = await db.select({ full_name: usersTable.full_name }).from(usersTable).where(eq(usersTable.id, winner.user_id))

    await db.update(ticketsTable).set({ is_winner: true }).where(eq(ticketsTable.id, winner.id))
    const [draw] = await db.update(drawsTable).set({
      status: 'ended',
      winner_id: winner.user_id,
      winner_name: winnerUser?.full_name || 'Unknown',
      winner_ticket: winner.ticket_ref,
    }).where(eq(drawsTable.id, req.params['id'] as string)).returning()

    const [user] = await db.select({ balance: usersTable.balance, total_won: usersTable.total_won }).from(usersTable).where(eq(usersTable.id, winner.user_id))
    if (user && draw) {
      await db.update(usersTable).set({
        balance: user.balance + draw.jackpot,
        total_won: user.total_won + draw.jackpot,
      }).where(eq(usersTable.id, winner.user_id))

      // Notify winner
      await db.insert(notificationsTable).values({
        user_id: winner.user_id,
        message: `🎉 Congratulations! You won ৳${draw.jackpot.toLocaleString()} from draw "${draw.name}"! Your ticket #${winner.ticket_ref} was the lucky winner! 🏆`,
      })

      // Notify all other ticket holders
      const otherHolders = [...new Set(tickets.filter(t => t.user_id !== winner.user_id).map(t => t.user_id))]
      if (otherHolders.length > 0) {
        await Promise.all(otherHolders.map(uid =>
          db.insert(notificationsTable).values({
            user_id: uid,
            message: `🏁 Draw "${draw.name}" ended. Winner: ${winnerUser?.full_name || 'Unknown'} (Ticket #${winner.ticket_ref}). Better luck next time!`,
          })
        ))
      }
    }

    res.json({ draw, winner })
  } catch (e: any) {
    console.error('[draws] select-winner error:', e)
    res.status(500).json({ error: e.message })
  }
})

export default router
