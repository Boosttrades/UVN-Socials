import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod";
import { postsTable } from "./posts";
import { usersTable } from "./users";

export const commentsTable = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id")
    .notNull()
    .references(() => postsTable.id, { onDelete: "cascade" }),
  authorId: uuid("author_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  // Handle of the user this comment is replying to, if any (denormalized —
  // mirrors the client's "Replying to @handle" affordance, not a real thread).
  replyToHandle: text("reply_to_handle"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const commentsRelations = relations(commentsTable, ({ one }) => ({
  post: one(postsTable, {
    fields: [commentsTable.postId],
    references: [postsTable.id],
  }),
  author: one(usersTable, {
    fields: [commentsTable.authorId],
    references: [usersTable.id],
  }),
}));

export const createCommentSchema = z.object({
  body: z.string().trim().min(1, "Comment cannot be empty").max(500),
  replyToHandle: z.string().trim().max(50).optional(),
});

export type Comment = typeof commentsTable.$inferSelect;
export type NewComment = typeof commentsTable.$inferInsert;
