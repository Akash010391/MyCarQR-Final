import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const legalPagesTable = pgTable("legal_pages", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type LegalPage = typeof legalPagesTable.$inferSelect;
