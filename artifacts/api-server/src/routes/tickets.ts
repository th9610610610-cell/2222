import { Router } from 'express'
import { db, ticketsTable, drawsTable, usersTable, notificationsTable, settingsTable } from '@workspace/db'
import { businessCodesTable, userCodeUsagesTable } from '@workspace/db/schema'
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

  const [buyer] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id))
  if (!buyer) return res.status(404).json({ error: 'User not found' })

  let discountPct = 0
  let codeType: 'user_partner' | 'business' | null = null
  let codeOwner: typeof buyer | null = null
  let businessCodeId: string | null = null

  const [settings] = await db.select().from(settingsTable)

  if (coupon_code?.trim()) {
    const upper = coupon_code.trim().toUpperCase()

    // Check user partner code
    if (settings?.user_code_enabled) {
      const [owner] = await db.select().from(usersTable).where(eq(usersTable.partner_code, upper))
      if (owner && owner.id !== buyer.id) {
        // Check per-draw usage limit
        const perDrawLimit = settings.user_code_per_draw_limit ?? 5
        const [usage] = await db.select().from(userCodeUsagesTable)
          .where(and(eq(userCodeUsagesTable.code_owner_id, owner.id), eq(userCodeUsagesTable.draw_id, draw_id)))
        const usedSoFar = usage?.tickets_used ?? 0
        if (usedSoFar + qty > perDrawLimit) {
          return res.status(400).json({
            error: `This partner code can only be used for ${perDrawLimit} tickets per draw (${perDrawLimit - usedSoFar} remaining)`,
          })
        }
        codeType = 'user_partner'
        codeOwner = owner
        discountPct = settings.user_code_buyer_discount_pct ?? 15
      }
    }

    // Check business code if no user code matched
    if (!codeType) {
      const [bc] = await db.select().from(businessCodesTable).where(eq(businessCodesTable.code, upper))
      if (bc) {
        if (!bc.is_active) return res.status(400).json({ error: 'This code is inactive' })
        if (bc.usage_count >= bc.usage_limit) return res.status(400).json({ error: 'Usage limit reached' })
        if (bc.expires_at && new Date() > new Date(bc.expires_at)) return res.status(400).json({ error: 'Code has expired' })
        codeType = 'business'
        businessCodeId = bc.id
        discountPct = bc.discount_pct
      } else if (!settings?.user_code_enabled) {
        return res.status(400).json({ error: 'Invalid code' })
      } else if (settings?.user_code_enabled) {
        return res.status(400).json({ error: 'Invalid code' })
      }
    }
  }

  // Apply user's personal referral bonus if no coupon code was submitted
  if (!codeType && !coupon_code?.trim()) {
    const now = new Date()
    if (
      buyer.referral_bonus_pct > 0 &&
      (!buyer.referral_bonus_expires || now < new Date(buyer.referral_bonus_expires))
    ) {
      discountPct = buyer.referral_bonus_pct
    }
  }

  const unitPrice = discountPct > 0
    ? Math.ceil(draw.ticket_price * (1 - discountPct / 100))
    : draw.ticket_price
  const totalCost = Math.max(qty, unitPrice * qty)

  if (buyer.balance < totalCost) return res.status(400).json({ error: 'Insufficient balance' })

  const ticketValues: { ticket_ref: string; draw_id: string; user_id: string; claim_code: string }[] = []
  for (let i = 0; i < qty; i++) {
    const ref = await uniqueTicketRef(draw_id)
    ticketValues.push({ ticket_ref: ref, draw_id, user_id: req.user!.id, claim_code: generateClaimCode() })
  }

  const tickets = await db.insert(ticketsTable).values(ticketValues).returning()

  await db.update(usersTable).set({
    balance: buyer.balance - totalCost,
    tickets_bought: buyer.tickets_bought + qty,
  }).where(eq(usersTable.id, req.user!.id))

  await db.update(drawsTable).set({ tickets_sold: draw.tickets_sold + qty }).where(eq(drawsTable.id, draw_id))

  // Business code: increment usage
  if (businessCodeId) {
    const [bc] = await db.select().from(businessCodesTable).where(eq(businessCodesTable.id, businessCodeId))
    if (bc) await db.update(businessCodesTable).set({ usage_count: bc.usage_count + qty }).where(eq(businessCodesTable.id, businessCodeId))
  }

  // User partner code: track usage + reward owner
  if (codeType === 'user_partner' && codeOwner) {
    const [existing] = await db.select().from(userCodeUsagesTable)
      .where(and(eq(userCodeUsagesTable.code_owner_id, codeOwner.id), eq(userCodeUsagesTable.draw_id, draw_id)))

    if (existing) {
      await db.update(userCodeUsagesTable)
        .set({ tickets_used: existing.tickets_used + qty })
        .where(and(eq(userCodeUsagesTable.code_owner_id, codeOwner.id), eq(userCodeUsagesTable.draw_id, draw_id)))
    } else {
      await db.insert(userCodeUsagesTable).values({
        code_owner_id: codeOwner.id, draw_id, tickets_used: qty,
      })
    }

    // Give owner a balance reward (owner_reward_pct% of the sale)
    const ownerRewardPct = settings?.user_code_owner_reward_pct ?? 5
    const ownerReward = Math.floor(totalCost * ownerRewardPct / 100)
    if (ownerReward > 0) {
      await db.update(usersTable).set({
        balance: codeOwner.balance + ownerReward,
      }).where(eq(usersTable.id, codeOwner.id))

      await db.insert(notificationsTable).values({
        user_id: codeOwner.id,
        message: `🎁 ${buyer.full_name} used your partner code! You earned ৳${ownerReward} reward (${ownerRewardPct}% of ৳${totalCost}) 💰`,
      })
    }
  }

  const discountNote = discountPct > 0 ? ` (${discountPct}% discount applied)` : ''
  await db.insert(notificationsTable).values({
    user_id: req.user!.id,
    message: `🎟️ You purchased ${qty} ticket${qty > 1 ? 's' : ''} for "${draw.name}" — Total: ৳${totalCost}${discountNote}. Good luck! 🍀`,
  })

  res.status(201).json({ tickets, discount_applied: discountPct, total_cost: totalCost })
})

export default router
