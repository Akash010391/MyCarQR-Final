import { pgTable, text, boolean, timestamp, integer, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vehiclesTable = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  ownerName: text("owner_name").notNull(),
  vehicleType: text("vehicle_type").notNull().default("car"),
  vehicleNumber: text("vehicle_number").notNull(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  color: text("color").notNull(),
  primaryContact: text("primary_contact").notNull(),
  whatsappNumber: text("whatsapp_number"),
  emergencyContact: text("emergency_contact"),
  preferredContactMethod: text("preferred_contact_method").notNull().default("call"),
  privacyMode: boolean("privacy_mode").notNull().default(false),
  qrCode: text("qr_code").notNull().unique(),
  qrActive: boolean("qr_active").notNull().default(true),
  safetyScore: integer("safety_score").notNull().default(50),
  stickerPrinted: boolean("sticker_printed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertVehicleSchema = createInsertSchema(vehiclesTable).omit({
  id: true,
  qrCode: true,
  safetyScore: true,
  stickerPrinted: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehiclesTable.$inferSelect;
