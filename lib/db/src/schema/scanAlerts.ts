import { pgTable, text, boolean, timestamp, integer, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vehiclesTable } from "./vehicles";

export const scanAlertsTable = pgTable("scan_alerts", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").notNull().references(() => vehiclesTable.id, { onDelete: "cascade" }),
  alertType: text("alert_type").notNull(),
  message: text("message"),
  scannerLocation: text("scanner_location"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertScanAlertSchema = createInsertSchema(scanAlertsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertScanAlert = z.infer<typeof insertScanAlertSchema>;
export type ScanAlert = typeof scanAlertsTable.$inferSelect;
