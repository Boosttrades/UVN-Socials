import { pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const followsTable = pgTable(
  "follows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    followerId: uuid("follower_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    followingId: uuid("following_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("follows_follower_following_unique").on(table.followerId, table.followingId)]
);

export type Follow = typeof followsTable.$inferSelect;
export type NewFollow = typeof followsTable.$inferInsert;
