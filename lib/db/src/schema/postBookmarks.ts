import { pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { postsTable } from "./posts";
import { usersTable } from "./users";

export const postBookmarksTable = pgTable(
  "post_bookmarks",
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
  (table) => [unique("post_bookmarks_post_user_unique").on(table.postId, table.userId)]
);

export type PostBookmark = typeof postBookmarksTable.$inferSelect;
export type NewPostBookmark = typeof postBookmarksTable.$inferInsert;
