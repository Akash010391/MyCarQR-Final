import { pgTable, text, timestamp, integer, serial, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vehiclesTable } from "./vehicles";

export const vehicleDocumentsTable = pgTable("vehicle_documents", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").notNull().references(() => vehiclesTable.id, { onDelete: "cascade" }),
  documentType: text("document_type").notNull(),
  expiryDate: date("expiry_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertVehicleDocumentSchema = createInsertSchema(vehicleDocumentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertVehicleDocument = z.infer<typeof insertVehicleDocumentSchema>;
export type VehicleDocument = typeof vehicleDocumentsTable.$inferSelect;
