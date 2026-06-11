import { Router } from 'express'
import { db, drawsTable, ticketsTable, usersTable, notificationsTable } from '@workspace/db'
import { eq } from 'drizzle-orm'
import { requireAuth, requireAdmin, AuthRequest } from '../middlewares/auth'

const router = Router()

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr]
  let s = seed >>> 0
  for (let i = a.length - 1; i > 0; i--) {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b)
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b)
    s = s ^ (s >>> 16)
    const j = Math.abs(s) % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function hashStr(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

// Public: list all draws with ticket counts for the winner page
router.get('/draws', async (_req, res) => {
  try {
    const draws = await db.select().from(drawsTable)
    res.json({ draws })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// Public: get shuffled tickets for a draw
router.get('/:drawId', async (req, res) => {
  try {
    const drawId = req.params['drawId'] as string
    const [draw] = await db.select().from(drawsTable).where(eq(drawsTable.id, drawId))
    if (!draw) return res.status(404).json({ error: 'Draw not found' })

    const tickets = await db.select({
      id: ticketsTable.id,
      ticket_ref: ticketsTable.ticket_ref,
      user_id: ticketsTable.user_id,
      is_winner: ticketsTable.is_winner,
      created_at: ticketsTable.created_at,
      user_name: usersTable.full_name,
    }).from(ticketsTable)
      .leftJoin(usersTable, eq(ticketsTable.user_id, usersTable.id))
      .where(eq(ticketsTable.draw_id, drawId))

    // Deterministic shuffle: seed = hash(draw_id + ticket_count)
    const seed = hashStr(drawId + tickets.length.toString())
    const shuffled = seededShuffle(tickets, seed)

    res.json({ draw, tickets: shuffled })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// Admin: manually pick a specific ticket as winner
router.post('/:drawId/pick', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const drawId = req.params['drawId'] as string
    const { ticket_id } = req.body

    if (!ticket_id) return res.status(400).json({ error: 'ticket_id is required' })

    const [draw] = await db.select().from(drawsTable).where(eq(drawsTable.id, drawId))
    if (!draw) return res.status(404).json({ error: 'Draw not found' })
    if (draw.winner_id) return res.status(400).json({ error: 'Winner already selected' })

    const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, ticket_id))
    if (!ticket || ticket.draw_id !== drawId) return res.status(404).json({ error: 'Ticket not found in this draw' })

    const [winnerUser] = await db.select({ full_name: usersTable.full_name, balance: usersTable.balance, total_won: usersTable.total_won })
      .from(usersTable).where(eq(usersTable.id, ticket.user_id))

    // Mark ticket as winner
    await db.update(ticketsTable).set({ is_winner: true }).where(eq(ticketsTable.id, ticket_id))

    // Update draw
    const [updatedDraw] = await db.update(drawsTable).set({
      status: 'ended',
      winner_id: ticket.user_id,
      winner_name: winnerUser?.full_name || 'Unknown',
      winner_ticket: ticket.ticket_ref,
    }).where(eq(drawsTable.id, drawId)).returning()

    // Credit jackpot to winner
    if (winnerUser) {
      await db.update(usersTable).set({
        balance: winnerUser.balance + draw.jackpot,
        total_won: winnerUser.total_won + draw.jackpot,
      }).where(eq(usersTable.id, ticket.user_id))
    }

    // Notify winner
    await db.insert(notificationsTable).values({
      user_id: ticket.user_id,
      message: `🎉 Congratulations! You won ৳${draw.jackpot.toLocaleString()} from draw "${draw.name}"! Your ticket #${ticket.ticket_ref} was selected as the winner! 🏆`,
    })

    // Notify all other ticket holders
    const allTickets = await db.select({ user_id: ticketsTable.user_id }).from(ticketsTable).where(eq(ticketsTable.draw_id, drawId))
    const otherUsers = [...new Set(allTickets.filter(t => t.user_id !== ticket.user_id).map(t => t.user_id))]
    if (otherUsers.length > 0) {
      await Promise.all(otherUsers.map(uid =>
        db.insert(notificationsTable).values({
          user_id: uid,
          message: `🏁 Draw "${draw.name}" ended! Winner: ${winnerUser?.full_name || 'Unknown'} (Ticket #${ticket.ticket_ref}). Better luck next time! 🍀`,
        })
      ))
    }

    res.json({ draw: updatedDraw, winner_ticket: ticket.ticket_ref, winner_name: winnerUser?.full_name })
  } catch (e: any) {
    console.error('[winner] pick error:', e)
    res.status(500).json({ error: e.message })
  }
})

export default router
