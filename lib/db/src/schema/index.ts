import { pgTable, text, integer, boolean, timestamp, uuid, pgEnum, uniqueIndex } from 'drizzle-orm/pg-core'
import { createInsertSchema } from 'drizzle-zod'

export const userRoleEnum = pgEnum('user_role', ['user', 'moderator', 'admin'])
export const drawStatusEnum = pgEnum('draw_status', ['upcoming', 'live', 'ended', 'rescheduled'])
export const depositStatusEnum = pgEnum('deposit_status', ['pending', 'approved', 'rejected'])
export const paymentMethodEnum = pgEnum('payment_method', ['bkash', 'nagad', 'rocket'])

export const usersTable = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  full_name: text('full_name').notNull(),
  phone: text('phone').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('user'),
  balance: integer('balance').notNull().default(0),
  total_deposited: integer('total_deposited').notNull().default(0),
  total_won: integer('total_won').notNull().default(0),
  tickets_bought: integer('tickets_bought').notNull().default(0),
  is_flagged: boolean('is_flagged').notNull().default(false),
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

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, created_at: true })
export const insertDrawSchema = createInsertSchema(drawsTable).omit({ id: true, created_at: true })
export const insertDepositSchema = createInsertSchema(depositsTable).omit({ id: true, created_at: true })

export type User = typeof usersTable.$inferSelect
export type Draw = typeof drawsTable.$inferSelect
export type Ticket = typeof ticketsTable.$inferSelect
export type Deposit = typeof depositsTable.$inferSelect
export type Notification = typeof notificationsTable.$inferSelect
export type Settings = typeof settingsTable.$inferSelect
