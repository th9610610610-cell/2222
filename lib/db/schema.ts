import { pgTable, text, integer, timestamp, boolean, decimal, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

// Enums
export const backgroundTypeEnum = pgEnum('background_type', ['natural', 'custom', 'picture']);
export const drawStatusEnum = pgEnum('draw_status', ['pending', 'live', 'completed', 'cancelled']);
export const discountTypeEnum = pgEnum('discount_type', ['referral', 'promotional']);
export const discountStatusEnum = pgEnum('discount_status', ['active', 'used', 'expired']);
export const adMediaTypeEnum = pgEnum('ad_media_type', ['image', 'video', 'text']);

// Users table
export const users = pgTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  accountNumber: text('account_number').unique().notNull(),
  email: text('email').unique().notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Draws table
export const draws = pgTable('draws', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text('name').notNull(),
  description: text('description'),
  backgroundType: backgroundTypeEnum('background_type').notNull().default('natural'),
  backgroundImageUrl: text('background_image_url'),
  customDesignData: jsonb('custom_design_data'),
  ticketPrice: decimal('ticket_price', { precision: 10, scale: 2 }).notNull(),
  totalTickets: integer('total_tickets').notNull(),
  status: drawStatusEnum('status').notNull().default('pending'),
  drawDate: timestamp('draw_date').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Tickets table
export const tickets = pgTable('tickets', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  drawId: text('draw_id')
    .notNull()
    .references(() => draws.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  ticketNumber: text('ticket_number').notNull(),
  purchasedAt: timestamp('purchased_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Winners table
export const winners = pgTable('winners', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  drawId: text('draw_id')
    .notNull()
    .references(() => draws.id, { onDelete: 'cascade' }),
  ticketId: text('ticket_id')
    .notNull()
    .references(() => tickets.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  ticketNumber: text('ticket_number').notNull(),
  holderName: text('holder_name').notNull(),
  holderEmail: text('holder_email'),
  prizeAmount: decimal('prize_amount', { precision: 12, scale: 2 }).notNull(),
  wonAt: timestamp('won_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Discounts table
export const discounts = pgTable('discounts', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  discountPercentage: integer('discount_percentage').notNull(),
  type: discountTypeEnum('type').notNull(),
  status: discountStatusEnum('status').notNull().default('active'),
  expiresAt: timestamp('expires_at').notNull(),
  referralCode: text('referral_code'),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Referrals table
export const referrals = pgTable('referrals', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  referrerId: text('referrer_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  refereeId: text('referee_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  discountGivenToReferee: text('discount_given_to_referee')
    .notNull()
    .references(() => discounts.id, { onDelete: 'cascade' }),
  discountGivenToReferrer: text('discount_given_to_referrer')
    .notNull()
    .references(() => discounts.id, { onDelete: 'cascade' }),
  ticketsPurchased: integer('tickets_purchased').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Ad Slots table
export const adSlots = pgTable('ad_slots', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  mediaType: adMediaTypeEnum('media_type').notNull(),
  mediaUrl: text('media_url'),
  textContent: text('text_content'),
  title: text('title'),
  description: text('description'),
  callToActionUrl: text('call_to_action_url'),
  displayDuration: integer('display_duration').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Winner Display Order table (for dynamic reordering)
export const winnerDisplayOrders = pgTable('winner_display_orders', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  drawId: text('draw_id')
    .notNull()
    .references(() => draws.id, { onDelete: 'cascade' }),
  displayOrder: text('display_order').notNull(), // JSON stringified array of ticket IDs
  seed: integer('seed').notNull(),
  lastUpdated: timestamp('last_updated').notNull().defaultNow(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Draw = typeof draws.$inferSelect;
export type NewDraw = typeof draws.$inferInsert;
export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
export type Winner = typeof winners.$inferSelect;
export type NewWinner = typeof winners.$inferInsert;
export type Discount = typeof discounts.$inferSelect;
export type NewDiscount = typeof discounts.$inferInsert;
export type Referral = typeof referrals.$inferSelect;
export type NewReferral = typeof referrals.$inferInsert;
export type AdSlot = typeof adSlots.$inferSelect;
export type NewAdSlot = typeof adSlots.$inferInsert;
export type WinnerDisplayOrder = typeof winnerDisplayOrders.$inferSelect;
export type NewWinnerDisplayOrder = typeof winnerDisplayOrders.$inferInsert;
