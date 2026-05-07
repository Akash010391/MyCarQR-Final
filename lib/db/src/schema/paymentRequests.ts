import { pgTable, text, integer, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const paymentRequestsTable = pgTable("payment_requests", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  email: text("email"),
  status: text("status").notNull().default("pending"),
  planType: text("plan_type").notNull().default("monthly"),
  amount: integer("amount").notNull(),
  screenshotBase64: text("screenshot_base64"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  expiresAt: timestamp("expires_at"),
});

export const insertPaymentRequestSchema = createInsertSchema(paymentRequestsTable).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
  expiresAt: true,
});

export type InsertPaymentRequest = z.infer<typeof insertPaymentRequestSchema>;
export type PaymentRequest = typeof paymentRequestsTable.$inferSelect;
