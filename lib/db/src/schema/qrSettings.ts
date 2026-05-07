import { pgTable, serial, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const qrSettings = pgTable("qr_settings", {
  id: serial("id").primaryKey(),
  brandName: text("brand_name").notNull().default("MyCarQR"),
  tagline: text("tagline").notNull().default("Scan. Connect. Stay Safe."),
  ctaText: text("cta_text").notNull().default("Scan to Connect"),
  enabledThemes: jsonb("enabled_themes").notNull().default(
    ["minimal-white", "classic-black-gold", "sporty-red", "royal-gold", "neon-blue", "army-green", "corporate-blue", "emergency-red"]
  ),
  premiumThemes: jsonb("premium_themes").notNull().default(
    ["classic-black-gold", "sporty-red", "royal-gold", "neon-blue", "army-green", "corporate-blue", "emergency-red"]
  ),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type QrSettings = typeof qrSettings.$inferSelect;
export type InsertQrSettings = typeof qrSettings.$inferInsert;
