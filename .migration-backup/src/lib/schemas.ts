import { pgTable, text, integer, decimal, timestamp, boolean, uuid, varchar, enum as pgEnum } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: varchar("phone", { length: 20 }).unique().notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  password: text("password").notNull(),
  balance: decimal("balance", { precision: 15, scale: 2 }).default("0"),
  totalDeposited: decimal("total_deposited", { precision: 15, scale: 2 }).default("0"),
  totalWon: decimal("total_won", { precision: 15, scale: 2 }).default("0"),
  ticketsBought: integer("tickets_bought").default(0),
  role: pgEnum("role", ["user", "admin", "moderator"]).default("user"),
  isFraudFlagged: boolean("is_fraud_flagged").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const draws = pgTable("draws", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  jackpot: decimal("jackpot", { precision: 15, scale: 2 }).notNull(),
  ticketPrice: decimal("ticket_price", { precision: 10, scale: 2 }).notNull(),
  maxTickets: integer("max_tickets").notNull(),
  totalSold: integer("total_sold").default(0),
  status: pgEnum("status", ["upcoming", "live", "ended"]).default("upcoming"),
  endDate: timestamp("end_date").notNull(),
  winnerId: uuid("winner_id"),
  winningTicketRef: varchar("winning_ticket_ref", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tickets = pgTable("tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  drawId: uuid("draw_id").notNull(),
  userId: uuid("user_id").notNull(),
  ticketRef: varchar("ticket_ref", { length: 20 }).unique().notNull(),
  isWinner: boolean("is_winner").default(false),
  purchasedAt: timestamp("purchased_at").defaultNow(),
});

export const deposits = pgTable("deposits", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  method: pgEnum("method", ["bKash", "Nagad", "Rocket"]).notNull(),
  senderPhone: varchar("sender_phone", { length: 20 }).notNull(),
  transactionId: varchar("transaction_id", { length: 50 }).notNull(),
  status: pgEnum("status", ["pending", "approved", "rejected"]).default("pending"),
  rejectionReason: text("rejection_reason"),
  fraudScore: integer("fraud_score").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  approvedBy: uuid("approved_by"),
});

export const adminSettings = pgTable("admin_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentMethod: pgEnum("payment_method", ["bKash", "Nagad", "Rocket"]).unique().notNull(),
  paymentNumber: varchar("payment_number", { length: 20 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: uuid("updated_by"),
});

export type User = typeof users.$inferSelect;
export type Draw = typeof draws.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type Deposit = typeof deposits.$inferSelect;
export type AdminSettings = typeof adminSettings.$inferSelect;