import { pgTable, text, integer, boolean, timestamp, serial } from "drizzle-orm/pg-core";

export const testimonialsTable = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull().default(""),
  text: text("text").notNull(),
  rating: integer("rating").notNull().default(5),
  avatarUrl: text("avatar_url").notNull().default(""),
  isPublished: boolean("is_published").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Testimonial = typeof testimonialsTable.$inferSelect;
