import { pgTable, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  userId: text("user_id").primaryKey(),
  email: text("email"),
  displayName: text("display_name"),
  phone: text("phone"),
  plan: text("plan").notNull().default("free"),
  isAdmin: boolean("is_admin").notNull().default(false),
  alertsThisMonth: integer("alerts_this_month").notNull().default(0),
  premiumExpiresAt: timestamp("premium_expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
