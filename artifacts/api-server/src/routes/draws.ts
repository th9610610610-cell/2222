import { Router } from 'express'
import { db, drawsTable, ticketsTable, usersTable, notificationsTable } from '@workspace/db'
import { eq, desc, and, lt } from 'drizzle-orm'
import { requireAuth, requireAdmin, AuthRequest } from '../middlewares/auth'
import { writeAudit } from '../utils/audit'

function getIP(req: any): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
}

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
    const { name, jackpot, ticket_price, max_tickets, end_date, background_type, background_image_url } = req.body
    const existing = await db.select({ draw_number: drawsTable.draw_number }).from(drawsTable)
    const maxNum = existing.reduce((max, d) => Math.max(max, d.draw_number ?? 0), 0)
    const [draw] = await db.insert(drawsTable).values({
      name,
      jackpot: Number(jackpot),
      ticket_price: Number(ticket_price),
      max_tickets: Number(max_tickets),
      end_date: new Date(end_date),
      draw_number: maxNum + 1,
      background_type: background_type || 'natural',
      background_image_url: background_image_url || '',
    }).returning()
    await writeAudit({ actor_id: req.user?.id, actor_role: req.user?.role, action: 'draw.create', target_type: 'draw', target_id: draw.id, detail: `name=${name} jackpot=${jackpot}`, ip_address: getIP(req) })
    res.status(201).json({ draw })
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create draw' })
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
    const { name, jackpot, ticket_price, max_tickets, end_date, status, background_type, background_image_url } = req.body
    const updates: Record<string, any> = {}
    if (name !== undefined) updates.name = name
    if (jackpot !== undefined) updates.jackpot = Number(jackpot)
    if (ticket_price !== undefined) updates.ticket_price = Number(ticket_price)
    if (max_tickets !== undefined) updates.max_tickets = Number(max_tickets)
    if (end_date !== undefined) updates.end_date = new Date(end_date)
    if (status !== undefined) updates.status = status
    if (background_type !== undefined) updates.background_type = background_type
    if (background_image_url !== undefined) updates.background_image_url = background_image_url

    const [prevDraw] = await db.select().from(drawsTable).where(eq(drawsTable.id, req.params['id'] as string))
    const [draw] = await db.update(drawsTable).set(updates).where(eq(drawsTable.id, req.params['id'] as string)).returning()

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
        notifAllUsers = false
      }

      if (notifMsg) {
        if (notifAllUsers) {
          const allUsers = await db.select({ id: usersTable.id }).from(usersTable)
          if (allUsers.length > 0) {
            await Promise.all(allUsers.map(u =>
              db.insert(notificationsTable).values({ user_id: u.id, message: notifMsg })
            ))
          }
        } else {
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

    if (status && prevDraw && prevDraw.status !== status) {
      await writeAudit({ actor_id: req.user?.id, actor_role: req.user?.role, action: 'draw.status_change', target_type: 'draw', target_id: req.params['id'], detail: `${prevDraw.status}→${status}`, ip_address: getIP(req) })
    }
    res.json({ draw })
  } catch (err: any) {
    console.error('[draws] PATCH error:', err)
    res.status(500).json({ error: 'Failed to update draw' })
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

      await db.insert(notificationsTable).values({
        user_id: winner.user_id,
        message: `🎉 Congratulations! You won ৳${draw.jackpot.toLocaleString()} from draw "${draw.name}"! Your ticket #${winner.ticket_ref} was the lucky winner! 🏆`,
      })

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

    await writeAudit({ actor_id: req.user?.id, actor_role: req.user?.role, action: 'draw.select_winner', target_type: 'draw', target_id: req.params['id'] as string, detail: `winner_ticket=${winner.ticket_ref} winner_user=${winner.user_id}`, ip_address: getIP(req) })
    res.json({ draw, winner })
  } catch (e: any) {
    console.error('[draws] select-winner error:', e)
    res.status(500).json({ error: 'Failed to select winner' })
  }
})

export default router
