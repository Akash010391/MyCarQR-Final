import { pgTable, text, boolean, timestamp, integer, serial, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vehiclesTable } from "./vehicles";

export const lostItemsTable = pgTable("lost_items", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").notNull().references(() => vehiclesTable.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  photos: jsonb("photos").notNull().default([]),
  latitude: text("latitude"),
  longitude: text("longitude"),
  locationLabel: text("location_label"),
  finderContact: text("finder_contact"),
  reportedAt: timestamp("reported_at").defaultNow().notNull(),
  isRead: boolean("is_read").notNull().default(false),
});

export const insertLostItemSchema = createInsertSchema(lostItemsTable).omit({
  id: true,
  reportedAt: true,
});

export type InsertLostItem = z.infer<typeof insertLostItemSchema>;
export type LostItem = typeof lostItemsTable.$inferSelect;
