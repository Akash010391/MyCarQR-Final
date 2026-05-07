import { pgTable, text, integer, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const paymentSettingsTable = pgTable("payment_settings", {
  id: serial("id").primaryKey(),
  upiId: text("upi_id").notNull().default(""),
  qrImageBase64: text("qr_image_base64").notNull().default(""),
  monthlyPrice: integer("monthly_price").notNull().default(99),
  yearlyPrice: integer("yearly_price").notNull().default(599),
  instructions: text("instructions").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPaymentSettingsSchema = createInsertSchema(paymentSettingsTable).omit({
  id: true,
  updatedAt: true,
});

export type InsertPaymentSettings = z.infer<typeof insertPaymentSettingsSchema>;
export type PaymentSettings = typeof paymentSettingsTable.$inferSelect;
