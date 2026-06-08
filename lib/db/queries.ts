import { db } from './index';
import { eq, and, desc, gt, lt } from 'drizzle-orm';
import {
  users,
  draws,
  tickets,
  winners,
  discounts,
  referrals,
  adSlots,
  winnerDisplayOrders,
  NewDraw,
  NewTicket,
  NewWinner,
  NewDiscount,
  NewReferral,
  NewAdSlot,
} from './schema';

// User queries
export async function getUserByAccountNumber(accountNumber: string) {
  return db.query.users.findFirst({
    where: eq(users.accountNumber, accountNumber),
  });
}

export async function getUserById(id: string) {
  return db.query.users.findFirst({
    where: eq(users.id, id),
  });
}

export async function createUser(data: { accountNumber: string; email: string; name: string }) {
  const result = await db.insert(users).values(data).returning();
  return result[0];
}

// Draw queries
export async function createDraw(data: NewDraw) {
  const result = await db.insert(draws).values(data).returning();
  return result[0];
}

export async function getDrawById(id: string) {
  return db.query.draws.findFirst({
    where: eq(draws.id, id),
  });
}

export async function getAllDraws() {
  return db.query.draws.findMany({
    orderBy: [desc(draws.createdAt)],
  });
}

export async function getLiveDraws() {
  return db.query.draws.findMany({
    where: eq(draws.status, 'live'),
    orderBy: [desc(draws.drawDate)],
  });
}

export async function updateDraw(id: string, data: Partial<NewDraw>) {
  const result = await db
    .update(draws)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(draws.id, id))
    .returning();
  return result[0];
}

// Ticket queries
export async function createTicket(data: NewTicket) {
  const result = await db.insert(tickets).values(data).returning();
  return result[0];
}

export async function getTicketsByDrawId(drawId: string) {
  return db.query.tickets.findMany({
    where: eq(tickets.drawId, drawId),
    orderBy: [desc(tickets.purchasedAt)],
  });
}

export async function getTicketsByUserId(userId: string) {
  return db.query.tickets.findMany({
    where: eq(tickets.userId, userId),
    orderBy: [desc(tickets.purchasedAt)],
  });
}

// Winner queries
export async function createWinner(data: NewWinner) {
  const result = await db.insert(winners).values(data).returning();
  return result[0];
}

export async function getWinnersByDrawId(drawId: string) {
  return db.query.winners.findMany({
    where: eq(winners.drawId, drawId),
    orderBy: [desc(winners.wonAt)],
  });
}

export async function getAllWinners() {
  return db.query.winners.findMany({
    orderBy: [desc(winners.wonAt)],
  });
}

// Discount queries
export async function createDiscount(data: NewDiscount) {
  const result = await db.insert(discounts).values(data).returning();
  return result[0];
}

export async function getDiscountById(id: string) {
  return db.query.discounts.findFirst({
    where: eq(discounts.id, id),
  });
}

export async function getActiveDiscountsByUserId(userId: string) {
  const now = new Date();
  return db.query.discounts.findMany({
    where: and(
      eq(discounts.userId, userId),
      eq(discounts.status, 'active'),
      gt(discounts.expiresAt, now)
    ),
    orderBy: [desc(discounts.createdAt)],
  });
}

export async function updateDiscount(id: string, data: Partial<NewDiscount>) {
  const result = await db
    .update(discounts)
    .set(data)
    .where(eq(discounts.id, id))
    .returning();
  return result[0];
}

// Referral queries
export async function createReferral(data: NewReferral) {
  const result = await db.insert(referrals).values(data).returning();
  return result[0];
}

export async function getReferralsByReferrerId(referrerId: string) {
  return db.query.referrals.findMany({
    where: eq(referrals.referrerId, referrerId),
    orderBy: [desc(referrals.createdAt)],
  });
}

export async function checkIfAlreadyReferred(referrerId: string, refereeId: string) {
  return db.query.referrals.findFirst({
    where: and(eq(referrals.referrerId, referrerId), eq(referrals.refereeId, refereeId)),
  });
}

// Ad Slot queries
export async function createAdSlot(data: NewAdSlot) {
  const result = await db.insert(adSlots).values(data).returning();
  return result[0];
}

export async function getActiveAdSlots() {
  return db.query.adSlots.findMany({
    where: eq(adSlots.isActive, true),
    orderBy: [desc(adSlots.displayDuration)],
  });
}

export async function getAllAdSlots() {
  return db.query.adSlots.findMany({
    orderBy: [desc(adSlots.createdAt)],
  });
}

export async function updateAdSlot(id: string, data: Partial<NewAdSlot>) {
  const result = await db
    .update(adSlots)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(adSlots.id, id))
    .returning();
  return result[0];
}

// Winner Display Order queries
export async function setWinnerDisplayOrder(
  drawId: string,
  displayOrder: string[],
  seed: number
) {
  const existing = await db.query.winnerDisplayOrders.findFirst({
    where: eq(winnerDisplayOrders.drawId, drawId),
  });

  if (existing) {
    const result = await db
      .update(winnerDisplayOrders)
      .set({
        displayOrder: JSON.stringify(displayOrder),
        seed,
        lastUpdated: new Date(),
      })
      .where(eq(winnerDisplayOrders.id, existing.id))
      .returning();
    return result[0];
  }

  const result = await db
    .insert(winnerDisplayOrders)
    .values({
      drawId,
      displayOrder: JSON.stringify(displayOrder),
      seed,
    })
    .returning();
  return result[0];
}

export async function getWinnerDisplayOrder(drawId: string) {
  return db.query.winnerDisplayOrders.findFirst({
    where: eq(winnerDisplayOrders.drawId, drawId),
  });
}
