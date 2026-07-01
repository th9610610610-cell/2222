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
  email: text('email').unique(),
  phone: text('phone').unique(),
  partner_code: text('partner_code').unique(),
  password_hash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('user'),
  balance: integer('balance').notNull().default(0),
  total_deposited: integer('total_deposited').notNull().default(0),
  total_won: integer('total_won').notNull().default(0),
  tickets_bought: integer('tickets_bought').notNull().default(0),
  is_flagged: boolean('is_flagged').notNull().default(false),
  is_verified: boolean('is_verified').notNull().default(false),
  totp_secret: text('totp_secret'),
  totp_enabled: boolean('totp_enabled').notNull().default(false),
  failed_login_attempts: integer('failed_login_attempts').notNull().default(0),
  locked_until: timestamp('locked_until'),
  referral_bonus_pct: integer('referral_bonus_pct').notNull().default(0),
  referral_bonus_expires: timestamp('referral_bonus_expires'),
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

export const withdrawalsTable = pgTable('withdrawals', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => usersTable.id),
  amount: integer('amount').notNull(),
  method: paymentMethodEnum('method').notNull(),
  account_number: text('account_number').notNull(),
  status: depositStatusEnum('status').notNull().default('pending'),
  rejection_reason: text('rejection_reason'),
  otp_verified: boolean('otp_verified').notNull().default(false),
  processed_by: uuid('processed_by'),
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

export const adminAuditLogsTable = pgTable('admin_audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  admin_id: uuid('admin_id').notNull().references(() => usersTable.id),
  action: text('action').notNull(),
  target_type: text('target_type').notNull(),
  target_id: text('target_id'),
  detail: text('detail'),
  ip: text('ip'),
  created_at: timestamp('created_at').notNull().defaultNow(),
})

export const loginAuditLogsTable = pgTable('login_audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => usersTable.id),
  ip: text('ip').notNull(),
  user_agent: text('user_agent').notNull().default(''),
  success: boolean('success').notNull(),
  reason: text('reason'),
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
  user_code_enabled: boolean('user_code_enabled').notNull().default(false),
  user_code_buyer_discount_pct: integer('user_code_buyer_discount_pct').notNull().default(15),
  user_code_owner_reward_pct: integer('user_code_owner_reward_pct').notNull().default(5),
  user_code_per_draw_limit: integer('user_code_per_draw_limit').notNull().default(5),
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

export const userCodeUsagesTable = pgTable('user_code_usages', {
  id: uuid('id').primaryKey().defaultRandom(),
  partner_code: text('partner_code').notNull(),
  draw_id: uuid('draw_id').notNull().references(() => drawsTable.id),
  buyer_id: uuid('buyer_id').notNull().references(() => usersTable.id),
  tickets_count: integer('tickets_count').notNull().default(0),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  usageUnique: uniqueIndex('user_code_usage_unique').on(table.partner_code, table.draw_id, table.buyer_id),
}))

export const campaignTypeEnum = pgEnum('campaign_type', [
  'partner_discount',
  'free_ticket',
  'unlimited_internet',
  'cashback',
  'giveaway',
  'buy_x_get_y',
  'special_offer',
])

export const campaignsTable = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  draw_id: uuid('draw_id').notNull().references(() => drawsTable.id, { onDelete: 'cascade' }),
  campaign_type: campaignTypeEnum('campaign_type').notNull(),
  title: text('title').notNull().default(''),
  config: text('config').notNull().default('{}'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').notNull().defaultNow(),
})

export const referralsTable = pgTable('referrals', {
  id: uuid('id').primaryKey().defaultRandom(),
  referrer_id: uuid('referrer_id').notNull().references(() => usersTable.id),
  referred_id: uuid('referred_id').notNull().references(() => usersTable.id),
  first_draw_id: uuid('first_draw_id').references(() => drawsTable.id),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  referredUnique: uniqueIndex('referrals_referred_unique').on(table.referred_id),
}))

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
  withdrawals: many(withdrawalsTable),
  notifications: many(notificationsTable),
  loginLogs: many(loginAuditLogsTable),
}))

export const depositsRelations = relations(depositsTable, ({ one }) => ({
  user: one(usersTable, { fields: [depositsTable.user_id], references: [usersTable.id] }),
}))

export const withdrawalsRelations = relations(withdrawalsTable, ({ one }) => ({
  user: one(usersTable, { fields: [withdrawalsTable.user_id], references: [usersTable.id] }),
}))

export const notificationsRelations = relations(notificationsTable, ({ one }) => ({
  user: one(usersTable, { fields: [notificationsTable.user_id], references: [usersTable.id] }),
}))

export const adminAuditLogsRelations = relations(adminAuditLogsTable, ({ one }) => ({
  admin: one(usersTable, { fields: [adminAuditLogsTable.admin_id], references: [usersTable.id] }),
}))

export const loginAuditLogsRelations = relations(loginAuditLogsTable, ({ one }) => ({
  user: one(usersTable, { fields: [loginAuditLogsTable.user_id], references: [usersTable.id] }),
}))

export const otpCodesTable = pgTable('otp_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  identifier: text('identifier').notNull(),
  purpose: text('purpose').notNull(),
  otp_hash: text('otp_hash').notNull(),
  attempts: integer('attempts').notNull().default(0),
  sent_at: timestamp('sent_at').notNull().defaultNow(),
  expires_at: timestamp('expires_at').notNull(),
})

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, created_at: true })
export const insertDrawSchema = createInsertSchema(drawsTable).omit({ id: true, created_at: true })
export const insertDepositSchema = createInsertSchema(depositsTable).omit({ id: true, created_at: true })

export type User = typeof usersTable.$inferSelect
export type Draw = typeof drawsTable.$inferSelect
export type Ticket = typeof ticketsTable.$inferSelect
export type Deposit = typeof depositsTable.$inferSelect
export type Withdrawal = typeof withdrawalsTable.$inferSelect
export type Notification = typeof notificationsTable.$inferSelect
export type Settings = typeof settingsTable.$inferSelect
export type AdminAuditLog = typeof adminAuditLogsTable.$inferSelect
export type LoginAuditLog = typeof loginAuditLogsTable.$inferSelect
export type Campaign = typeof campaignsTable.$inferSelect
export type Referral = typeof referralsTable.$inferSelect
