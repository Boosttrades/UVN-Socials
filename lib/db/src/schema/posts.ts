import { relations } from "drizzle-orm";
import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod";
import { usersTable } from "./users";

export const POST_TYPES = ["update", "incident", "job", "event", "business", "traffic"] as const;
export type PostType = (typeof POST_TYPES)[number];

// Mirrors PostCategory in artifacts/ughelli-vibes/constants/mockData.ts — keep in sync.
export const POST_CATEGORIES = [
  "News",
  "Jobs",
  "Events",
  "Business",
  "Sports",
  "Entertainment",
  "Health",
  "Traffic",
  "Emergency",
  "Community",
] as const;
export type PostCategoryName = (typeof POST_CATEGORIES)[number];

export const postsTable = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  authorId: uuid("author_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type", { enum: POST_TYPES }).notNull(),
  category: text("category", { enum: POST_CATEGORIES }),
  headline: text("headline").notNull(),
  body: text("body"),
  imageUrl: text("image_url"),
  isEmergency: boolean("is_emergency").notNull().default(false),
  sharesCount: integer("shares_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const postsRelations = relations(postsTable, ({ one }) => ({
  author: one(usersTable, {
    fields: [postsTable.authorId],
    references: [usersTable.id],
  }),
}));

export const createPostSchema = z.object({
  type: z.enum(POST_TYPES),
  category: z.enum(POST_CATEGORIES).optional(),
  headline: z.string().trim().min(1, "Headline is required").max(200),
  body: z.string().trim().max(1000).optional(),
  imageUrl: z.string().trim().min(1).max(500).optional(),
  isEmergency: z.boolean().optional(),
});

export type Post = typeof postsTable.$inferSelect;
export type NewPost = typeof postsTable.$inferInsert;
