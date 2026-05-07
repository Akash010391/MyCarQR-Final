import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const notificationPreferencesTable = pgTable("notification_preferences", {
  userId: text("user_id").primaryKey(),
  scanAlerts: boolean("scan_alerts").notNull().default(true),
  smsAlerts: boolean("sms_alerts").notNull().default(false),
  emailAlerts: boolean("email_alerts").notNull().default(true),
  emergencyAlerts: boolean("emergency_alerts").notNull().default(true),
  orderUpdates: boolean("order_updates").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type NotificationPreferences = typeof notificationPreferencesTable.$inferSelect;
