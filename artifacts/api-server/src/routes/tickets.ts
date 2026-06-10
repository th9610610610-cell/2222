import { Router } from 'express'
import { db, ticketsTable, drawsTable, usersTable, notificationsTable } from '@workspace/db'
import { businessCodesTable, settingsTable } from '@workspace/db/schema'
import { eq, desc, and, count } from 'drizzle-orm'
import { requireAuth, AuthRequest } from '../middlewares/auth'

const router = Router()

const MAX_TICKETS_PER_USER_PER_DRAW = 50

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
  const { draw_id, quantity = 1, coupon_code } = req.body
  const qty = Math.max(1, Math.min(20, Number(quantity)))

  const [draw] = await db.select().from(drawsTable).where(eq(drawsTable.id, draw_id))
  if (!draw) return res.status(404).json({ error: 'Draw not found' })
  if (draw.status !== 'live') return res.status(400).json({ error: 'This draw is not live' })
  if (draw.tickets_sold + qty > draw.max_tickets) return res.status(400).json({ error: 'Not enough tickets remaining' })

  if (new Date() > new Date(draw.end_date)) {
    await db.update(drawsTable).set({ status: 'ended' }).where(eq(drawsTable.id, draw_id))
    return res.status(400).json({ error: 'This draw has ended — ticket purchase is closed' })
  }

  // Business logic: block flagged users from purchasing
  if (req.user!.is_flagged) {
    return res.status(403).json({ error: 'Your account has been flagged. Contact support to resolve.' })
  }

  // Business logic: per-user per-draw ticket limit
  const [existingCount] = await db
    .select({ n: count() })
    .from(ticketsTable)
    .where(and(eq(ticketsTable.draw_id, draw_id), eq(ticketsTable.user_id, req.user!.id)))
  const alreadyOwned = Number(existingCount?.n ?? 0)
  if (alreadyOwned + qty > MAX_TICKETS_PER_USER_PER_DRAW) {
    return res.status(400).json({ error: `You can only hold ${MAX_TICKETS_PER_USER_PER_DRAW} tickets per draw. You already have ${alreadyOwned}.` })
  }

  const [buyer] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id))
  if (!buyer) return res.status(404).json({ error: 'User not found' })

  // Determine discount
  let discountPct = 0
  let discountType: 'referral_bonus' | 'business' | 'user_partner' | null = null
  let businessCodeId: string | null = null
  let userPartnerReferrer: typeof buyer | null = null
  let userPartnerReferrerRewardPct = 0

  const now = new Date()

  const hasActiveBonus = buyer.referral_bonus_pct > 0 &&
    buyer.referral_bonus_expires != null &&
    new Date(buyer.referral_bonus_expires) > now

  if (hasActiveBonus) {
    discountPct = buyer.referral_bonus_pct
    discountType = 'referral_bonus'
  } else if (coupon_code?.trim()) {
    const code = coupon_code.trim().toUpperCase()
    const [settings] = await db.select().from(settingsTable)
    const [bc] = await db.select().from(businessCodesTable).where(eq(businessCodesTable.code, code))
    if (bc) {
      if (!bc.is_active) return res.status(400).json({ error: 'Coupon code is inactive' })
      if (bc.usage_count >= bc.usage_limit) return res.status(400).json({ error: 'Coupon usage limit reached' })
      if (bc.expires_at && new Date() > new Date(bc.expires_at)) return res.status(400).json({ error: 'Coupon code has expired' })
      discountPct = bc.discount_pct
      discountType = 'business'
      businessCodeId = bc.id
    } else if (settings?.user_partner_code_enabled) {
      const [codeOwner] = await db.select().from(usersTable).where(eq(usersTable.partner_code, code))
      if (codeOwner) {
        if (codeOwner.id === buyer.id) return res.status(400).json({ error: 'You cannot use your own partner code' })
        discountPct = settings.user_partner_buyer_discount_pct
        userPartnerReferrerRewardPct = settings.user_partner_referrer_reward_pct
        discountType = 'user_partner'
        userPartnerReferrer = codeOwner
      } else {
        return res.status(400).json({ error: 'Invalid coupon code' })
      }
    } else {
      return res.status(400).json({ error: 'Invalid coupon code' })
    }
  }

  const unitPrice = discountPct > 0
    ? Math.ceil(draw.ticket_price * (1 - discountPct / 100))
    : draw.ticket_price
  const totalCost = unitPrice * qty
  const safeCost = Math.max(qty, totalCost)

  if (buyer.balance < safeCost) return res.status(400).json({ error: 'Insufficient balance' })

  // Generate all ticket refs before the transaction
  const ticketValues: { ticket_ref: string; draw_id: string; user_id: string; claim_code: string }[] = []
  for (let i = 0; i < qty; i++) {
    const ref = await uniqueTicketRef(draw_id)
    ticketValues.push({ ticket_ref: ref, draw_id, user_id: req.user!.id, claim_code: generateClaimCode() })
  }

  // Wrap purchase in a transaction for atomicity
  let tickets: typeof ticketValues = []
  await db.transaction(async (tx) => {
    // Re-verify balance inside transaction
    const [freshBuyer] = await tx.select({ balance: usersTable.balance }).from(usersTable).where(eq(usersTable.id, req.user!.id))
    if (!freshBuyer || freshBuyer.balance < safeCost) throw new Error('Insufficient balance')

    tickets = await tx.insert(ticketsTable).values(ticketValues).returning() as any

    await tx.update(usersTable).set({
      balance: freshBuyer.balance - safeCost,
      tickets_bought: buyer.tickets_bought + qty,
      ...(hasActiveBonus ? { referral_bonus_pct: 0, referral_bonus_expires: null } : {}),
    }).where(eq(usersTable.id, req.user!.id))

    await tx.update(drawsTable).set({ tickets_sold: draw.tickets_sold + qty }).where(eq(drawsTable.id, draw_id))

    if (businessCodeId) {
      const [bc] = await tx.select().from(businessCodesTable).where(eq(businessCodesTable.id, businessCodeId))
      if (bc) await tx.update(businessCodesTable).set({ usage_count: bc.usage_count + qty }).where(eq(businessCodesTable.id, businessCodeId))
    }
  })

  // Post-transaction: notifications + partner reward (non-critical, outside tx)
  if (userPartnerReferrer && userPartnerReferrerRewardPct > 0) {
    const referrerBonus = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    await db.update(usersTable).set({
      referral_bonus_pct: userPartnerReferrerRewardPct,
      referral_bonus_expires: referrerBonus,
    }).where(eq(usersTable.id, userPartnerReferrer.id)).catch(() => {})
    await db.insert(notificationsTable).values({
      user_id: userPartnerReferrer.id,
      message: `🎁 ${buyer.full_name} used your partner code! You've earned ${userPartnerReferrerRewardPct}% discount on your next ticket. Valid for 7 days! 🎟️`,
    }).catch(() => {})
  }

  const discountNote = discountPct > 0 ? ` (${discountPct}% discount applied)` : ''
  await db.insert(notificationsTable).values({
    user_id: req.user!.id,
    message: `🎟️ Purchase Successful! You bought ${qty} ticket${qty > 1 ? 's' : ''} for "${draw.name}" — Total: ৳${safeCost}${discountNote}. Good luck! 🍀`,
  }).catch(() => {})

  res.status(201).json({ tickets, discount_applied: discountPct, discount_type: discountType, total_cost: safeCost })
})

export default router
