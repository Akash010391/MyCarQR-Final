import { pgTable, text, boolean, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sosProfilesTable = pgTable("sos_profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  emergencyContactName: text("emergency_contact_name").notNull().default(""),
  emergencyPhone: text("emergency_phone").notNull().default(""),
  bloodGroup: text("blood_group").notNull().default(""),
  medicalNotes: text("medical_notes").notNull().default(""),
  altContactName: text("alt_contact_name").notNull().default(""),
  altContactPhone: text("alt_contact_phone").notNull().default(""),
  isEnabled: boolean("is_enabled").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSosProfileSchema = createInsertSchema(sosProfilesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSosProfile = z.infer<typeof insertSosProfileSchema>;
export type SosProfile = typeof sosProfilesTable.$inferSelect;
