import { Router } from 'express'
import { db, ticketsTable, drawsTable, usersTable, notificationsTable } from '@workspace/db'
import { businessCodesTable } from '@workspace/db/schema'
import { eq, desc, and, count } from 'drizzle-orm'
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
  const { draw_id, quantity = 1, referral_phone, business_code } = req.body
  const qty = Math.max(1, Math.min(20, Number(quantity)))

  const [draw] = await db.select().from(drawsTable).where(eq(drawsTable.id, draw_id))
  if (!draw) return res.status(404).json({ error: 'Draw not found' })
  if (draw.status !== 'live') return res.status(400).json({ error: 'This draw is not live' })
  if (draw.tickets_sold + qty > draw.max_tickets) return res.status(400).json({ error: 'Not enough tickets remaining' })

  if (new Date() > new Date(draw.end_date)) {
    await db.update(drawsTable).set({ status: 'ended' }).where(eq(drawsTable.id, draw_id))
    return res.status(400).json({ error: 'This draw has ended — ticket purchase is closed' })
  }

  const [buyer] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id))
  if (!buyer) return res.status(404).json({ error: 'User not found' })

  // Determine discount
  let discountPct = 0
  let referrer: typeof buyer | null = null
  let businessCodeId: string | null = null

  const now = new Date()
  const hasActiveBonus = buyer.referral_bonus_pct > 0 &&
    buyer.referral_bonus_expires != null &&
    new Date(buyer.referral_bonus_expires) > now

  if (hasActiveBonus) {
    discountPct = buyer.referral_bonus_pct
  } else if (business_code?.trim()) {
    const code = business_code.trim().toUpperCase()
    const [bc] = await db.select().from(businessCodesTable).where(eq(businessCodesTable.code, code))
    if (bc && bc.is_active && bc.usage_count < bc.usage_limit && (!bc.expires_at || new Date() <= new Date(bc.expires_at))) {
      discountPct = bc.discount_pct
      businessCodeId = bc.id
    }
  } else if (referral_phone && referral_phone.trim()) {
    const phone = referral_phone.trim()
    if (phone !== buyer.phone) {
      const [ref] = await db.select().from(usersTable).where(eq(usersTable.phone, phone))
      if (ref) {
        referrer = ref
        discountPct = 50
      }
    }
  }

  const unitPrice = discountPct > 0
    ? Math.ceil(draw.ticket_price * (1 - discountPct / 100))
    : draw.ticket_price
  const totalCost = unitPrice * qty

  // Ensure discount doesn't make ticket free (min ৳1 per ticket)
  const safeCost = Math.max(qty, totalCost)

  if (buyer.balance < safeCost) return res.status(400).json({ error: 'Insufficient balance' })

  const ticketValues: { ticket_ref: string; draw_id: string; user_id: string; claim_code: string }[] = []
  for (let i = 0; i < qty; i++) {
    const ref = await uniqueTicketRef(draw_id)
    ticketValues.push({ ticket_ref: ref, draw_id, user_id: req.user!.id, claim_code: generateClaimCode() })
  }

  const tickets = await db.insert(ticketsTable).values(ticketValues).returning()

  // Deduct from buyer
  await db.update(usersTable).set({
    balance: buyer.balance - safeCost,
    tickets_bought: buyer.tickets_bought + qty,
    // Clear used bonus if it was used
    ...(hasActiveBonus ? { referral_bonus_pct: 0, referral_bonus_expires: null } : {}),
  }).where(eq(usersTable.id, req.user!.id))

  await db.update(drawsTable).set({ tickets_sold: draw.tickets_sold + qty }).where(eq(drawsTable.id, draw_id))

  // Increment business code usage
  if (businessCodeId) {
    const [bc] = await db.select().from(businessCodesTable).where(eq(businessCodesTable.id, businessCodeId))
    if (bc) await db.update(businessCodesTable).set({ usage_count: bc.usage_count + qty }).where(eq(businessCodesTable.id, businessCodeId))
  }

  // Give referrer their bonus (7 days)
  if (referrer) {
    const referrerBonus = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    await db.update(usersTable).set({
      referral_bonus_pct: 50,
      referral_bonus_expires: referrerBonus,
    }).where(eq(usersTable.id, referrer.id))

    await db.insert(notificationsTable).values({
      user_id: referrer.id,
      message: `🎁 ${buyer.full_name} used your referral! You've earned a 50% discount on your next ticket purchase. Valid for 7 days! 🎟️`,
    })
  }

  const discountNote = discountPct > 0
    ? ` (${discountPct}% referral discount applied)`
    : ''

  await db.insert(notificationsTable).values({
    user_id: req.user!.id,
    message: `🎟️ You purchased ${qty} ticket${qty > 1 ? 's' : ''} for draw "${draw.name}" — Total: ৳${safeCost}${discountNote}. Good luck! 🍀`,
  })

  res.status(201).json({ tickets, discount_applied: discountPct, total_cost: safeCost })
})

export default router
