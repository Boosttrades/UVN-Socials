import { pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { postsTable } from "./posts";
import { usersTable } from "./users";

export const postLikesTable = pgTable(
  "post_likes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => postsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("post_likes_post_user_unique").on(table.postId, table.userId)]
);

export type PostLike = typeof postLikesTable.$inferSelect;
export type NewPostLike = typeof postLikesTable.$inferInsert;
