import { pgTable, text, timestamp, serial, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const pushTokensTable = pgTable("push_tokens", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.userId, { onDelete: "cascade" }),
  token: text("token").notNull(),
  platform: text("platform").notNull().default("android"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("push_tokens_user_token_idx").on(table.userId, table.token),
]);

export type PushToken = typeof pushTokensTable.$inferSelect;
