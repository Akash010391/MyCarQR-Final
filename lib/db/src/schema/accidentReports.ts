import { pgTable, text, boolean, timestamp, integer, serial, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vehiclesTable } from "./vehicles";

export const accidentReportsTable = pgTable("accident_reports", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").notNull().references(() => vehiclesTable.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  photos: jsonb("photos").notNull().default([]),
  latitude: text("latitude"),
  longitude: text("longitude"),
  locationLabel: text("location_label"),
  reportedAt: timestamp("reported_at").defaultNow().notNull(),
  isRead: boolean("is_read").notNull().default(false),
});

export const insertAccidentReportSchema = createInsertSchema(accidentReportsTable).omit({
  id: true,
  reportedAt: true,
});

export type InsertAccidentReport = z.infer<typeof insertAccidentReportSchema>;
export type AccidentReport = typeof accidentReportsTable.$inferSelect;
