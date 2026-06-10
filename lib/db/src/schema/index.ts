import { pgTable, text, integer, boolean, timestamp, uuid, pgEnum, uniqueIndex } from 'drizzle-orm/pg-core'
import { createInsertSchema } from 'drizzle-zod'

export const userRoleEnum = pgEnum('user_role', ['user', 'moderator', 'admin'])
export const adTypeEnum = pgEnum('ad_type', ['text', 'image', 'video'])
export const drawStatusEnum = pgEnum('draw_status', ['upcoming', 'live', 'ended', 'rescheduled'])
export const depositStatusEnum = pgEnum('deposit_status', ['pending', 'approved', 'rejected'])
export const paymentMethodEnum = pgEnum('payment_method', ['bkash', 'nagad', 'rocket'])

export const usersTable = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  full_name: text('full_name').notNull(),
  phone: text('phone').notNull().unique(),
  email: text('email').unique(),
  email_verified: boolean('email_verified').notNull().default(false),
  password_hash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('user'),
  balance: integer('balance').notNull().default(0),
  total_deposited: integer('total_deposited').notNull().default(0),
  total_won: integer('total_won').notNull().default(0),
  tickets_bought: integer('tickets_bought').notNull().default(0),
  is_flagged: boolean('is_flagged').notNull().default(false),
  login_attempts: integer('login_attempts').notNull().default(0),
  lockout_until: timestamp('lockout_until'),
  referral_bonus_pct: integer('referral_bonus_pct').notNull().default(0),
  referral_bonus_expires: timestamp('referral_bonus_expires'),
  partner_code: text('partner_code').unique(),
  created_at: timestamp('created_at').notNull().defaultNow(),
})

export const otpTokensTable = pgTable('otp_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  code: text('code').notNull(),
  type: text('type').notNull(),
  expires_at: timestamp('expires_at').notNull(),
  used: boolean('used').notNull().default(false),
  ip_address: text('ip_address'),
  created_at: timestamp('created_at').notNull().defaultNow(),
})

export const knownDevicesTable = pgTable('known_devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  device_hash: text('device_hash').notNull(),
  user_agent: text('user_agent'),
  last_seen: timestamp('last_seen').notNull().defaultNow(),
  created_at: timestamp('created_at').notNull().defaultNow(),
})

export const drawsTable = pgTable('draws', {
  id: uuid('id').primaryKey().defaultRandom(),
  draw_number: integer('draw_number'),
  name: text('name').notNull(),
  jackpot: integer('jackpot').notNull(),
  ticket_price: integer('ticket_price').notNull(),
  max_tickets: integer('max_tickets').notNull(),
  tickets_sold: integer('tickets_sold').notNull().default(0),
  status: drawStatusEnum('status').notNull().default('upcoming'),
  end_date: timestamp('end_date').notNull(),
  winner_id: uuid('winner_id'),
  winner_name: text('winner_name'),
  winner_ticket: text('winner_ticket'),
  background_type: text('background_type').notNull().default('natural'),
  background_image_url: text('background_image_url').notNull().default(''),
  created_at: timestamp('created_at').notNull().defaultNow(),
})

export const ticketsTable = pgTable('tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticket_ref: text('ticket_ref').notNull(),
  draw_id: uuid('draw_id').notNull().references(() => drawsTable.id),
  user_id: uuid('user_id').notNull().references(() => usersTable.id),
  claim_code: text('claim_code').notNull().default(''),
  is_winner: boolean('is_winner').notNull().default(false),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  drawTicketUnique: uniqueIndex('tickets_draw_ticket_unique').on(table.draw_id, table.ticket_ref),
}))

export const depositsTable = pgTable('deposits', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => usersTable.id),
  amount: integer('amount').notNull(),
  method: paymentMethodEnum('method').notNull(),
  sender_phone: text('sender_phone').notNull(),
  trx_id: text('trx_id').notNull(),
  status: depositStatusEnum('status').notNull().default('pending'),
  rejection_reason: text('rejection_reason'),
  fraud_score: integer('fraud_score').notNull().default(0),
  fraud_flags: text('fraud_flags').array().notNull().default([]),
  created_at: timestamp('created_at').notNull().defaultNow(),
})

export const notificationsTable = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => usersTable.id),
  message: text('message').notNull(),
  is_read: boolean('is_read').notNull().default(false),
  is_pinned: boolean('is_pinned').notNull().default(false),
  created_at: timestamp('created_at').notNull().defaultNow(),
})

export const settingsTable = pgTable('settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  bkash_number: text('bkash_number').notNull().default(''),
  nagad_number: text('nagad_number').notNull().default(''),
  rocket_number: text('rocket_number').notNull().default(''),
  whatsapp_number: text('whatsapp_number').notNull().default(''),
  payment_number: text('payment_number').notNull().default(''),
  announcement: text('announcement').notNull().default(''),
  user_partner_code_enabled: boolean('user_partner_code_enabled').notNull().default(false),
  user_partner_buyer_discount_pct: integer('user_partner_buyer_discount_pct').notNull().default(10),
  user_partner_referrer_reward_pct: integer('user_partner_referrer_reward_pct').notNull().default(10),
})

export const businessCodesTable = pgTable('business_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  discount_pct: integer('discount_pct').notNull().default(50),
  usage_limit: integer('usage_limit').notNull().default(100),
  usage_count: integer('usage_count').notNull().default(0),
  expires_at: timestamp('expires_at'),
  is_active: boolean('is_active').notNull().default(true),
  description: text('description').notNull().default(''),
  created_at: timestamp('created_at').notNull().defaultNow(),
})

export const adsTable = pgTable('ads', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: adTypeEnum('type').notNull().default('text'),
  title: text('title').notNull().default(''),
  content: text('content').notNull(),
  link_url: text('link_url').notNull().default(''),
  is_active: boolean('is_active').notNull().default(true),
  display_order: integer('display_order').notNull().default(0),
  created_at: timestamp('created_at').notNull().defaultNow(),
})

import { relations } from 'drizzle-orm'

export const ticketsRelations = relations(ticketsTable, ({ one }) => ({
  draw: one(drawsTable, { fields: [ticketsTable.draw_id], references: [drawsTable.id] }),
  user: one(usersTable, { fields: [ticketsTable.user_id], references: [usersTable.id] }),
}))

export const drawsRelations = relations(drawsTable, ({ many }) => ({
  tickets: many(ticketsTable),
}))

export const usersRelations = relations(usersTable, ({ many }) => ({
  tickets: many(ticketsTable),
  deposits: many(depositsTable),
  notifications: many(notificationsTable),
}))

export const depositsRelations = relations(depositsTable, ({ one }) => ({
  user: one(usersTable, { fields: [depositsTable.user_id], references: [usersTable.id] }),
}))

export const notificationsRelations = relations(notificationsTable, ({ one }) => ({
  user: one(usersTable, { fields: [notificationsTable.user_id], references: [usersTable.id] }),
}))

export const auditLogsTable = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actor_id: uuid('actor_id'),
  actor_role: text('actor_role'),
  action: text('action').notNull(),
  target_type: text('target_type'),
  target_id: text('target_id'),
  detail: text('detail'),
  ip_address: text('ip_address'),
  created_at: timestamp('created_at').notNull().defaultNow(),
})

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, created_at: true })
export const insertDrawSchema = createInsertSchema(drawsTable).omit({ id: true, created_at: true })
export const insertDepositSchema = createInsertSchema(depositsTable).omit({ id: true, created_at: true })

export type User = typeof usersTable.$inferSelect
export type Draw = typeof drawsTable.$inferSelect
export type Ticket = typeof ticketsTable.$inferSelect
export type Deposit = typeof depositsTable.$inferSelect
export type Notification = typeof notificationsTable.$inferSelect
export type Settings = typeof settingsTable.$inferSelect
