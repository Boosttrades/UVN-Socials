import { Router, type IRouter } from "express";
import {
  db,
  postsTable,
  usersTable,
  commentsTable,
  postLikesTable,
  postBookmarksTable,
  createPostSchema,
  createCommentSchema,
} from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { requireAuth, optionalAuth } from "../middlewares/auth";

const router: IRouter = Router();

// ─── GET /api/posts ──────────────────────────────────────────────────────────
// Public feed — newest first. No auth required to read, but if a valid
// session is present we include this user's like/bookmark state per post.

router.get("/", optionalAuth, async (req, res) => {
  const currentUser = (req as any).currentUser as { id: string } | undefined;

  const rows = await db
    .select({
      id: postsTable.id,
      type: postsTable.type,
      category: postsTable.category,
      headline: postsTable.headline,
      body: postsTable.body,
      imageUrl: postsTable.imageUrl,
      isEmergency: postsTable.isEmergency,
      sharesCount: postsTable.sharesCount,
      createdAt: postsTable.createdAt,
      author: {
        id: usersTable.id,
        name: usersTable.name,
        username: usersTable.username,
      },
      likesCount: sql<number>`(select count(*)::int from ${postLikesTable} where ${postLikesTable.postId} = ${postsTable.id})`,
      commentsCount: sql<number>`(select count(*)::int from ${commentsTable} where ${commentsTable.postId} = ${postsTable.id})`,
      isLiked: currentUser
        ? sql<boolean>`exists(select 1 from ${postLikesTable} where ${postLikesTable.postId} = ${postsTable.id} and ${postLikesTable.userId} = ${currentUser.id})`
        : sql<boolean>`false`,
      isBookmarked: currentUser
        ? sql<boolean>`exists(select 1 from ${postBookmarksTable} where ${postBookmarksTable.postId} = ${postsTable.id} and ${postBookmarksTable.userId} = ${currentUser.id})`
        : sql<boolean>`false`,
    })
    .from(postsTable)
    .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
    .orderBy(desc(postsTable.createdAt));

  res.json({ posts: rows });
});

// ─── POST /api/posts ──────────────────────────────────────────────────────────
// Create a post — requires auth. Author is always the logged-in user.
// Accepts an optional imageUrl, which must already be uploaded via the
// object storage upload flow (see /api/storage/uploads/request-url).

router.post("/", requireAuth, async (req, res) => {
  const parsed = createPostSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const currentUser = (req as any).currentUser;

  const [post] = await db
    .insert(postsTable)
    .values({
      authorId: currentUser.id,
      type: parsed.data.type,
      category: parsed.data.category,
      headline: parsed.data.headline,
      body: parsed.data.body,
      imageUrl: parsed.data.imageUrl,
      isEmergency: parsed.data.isEmergency ?? false,
    })
    .returning();

  res.status(201).json({
    post: {
      ...post,
      likesCount: 0,
      commentsCount: 0,
      isLiked: false,
      isBookmarked: false,
      author: {
        id: currentUser.id,
        name: currentUser.name,
        username: currentUser.username,
      },
    },
  });
});

// ─── DELETE /api/posts/:id ────────────────────────────────────────────────────
// Only the author can delete their own post.

router.delete("/:id", requireAuth, async (req, res) => {
  const currentUser = (req as any).currentUser;
  const id = String(req.params.id);

  const [existing] = await db.select().from(postsTable).where(eq(postsTable.id, id)).limit(1);

  if (!existing) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  if (existing.authorId !== currentUser.id) {
    res.status(403).json({ error: "You can only delete your own posts" });
    return;
  }

  await db.delete(postsTable).where(eq(postsTable.id, id));
  res.json({ message: "Post deleted" });
});

// ─── POST /api/posts/:id/like ────────────────────────────────────────────────
// Toggle a like for the current user. Returns the new state + total count.

router.post("/:id/like", requireAuth, async (req, res) => {
  const currentUser = (req as any).currentUser;
  const postId = String(req.params.id);

  const [post] = await db.select({ id: postsTable.id }).from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const [existing] = await db
    .select()
    .from(postLikesTable)
    .where(and(eq(postLikesTable.postId, postId), eq(postLikesTable.userId, currentUser.id)))
    .limit(1);

  let liked: boolean;
  if (existing) {
    await db.delete(postLikesTable).where(eq(postLikesTable.id, existing.id));
    liked = false;
  } else {
    await db.insert(postLikesTable).values({ postId, userId: currentUser.id });
    liked = true;
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(postLikesTable)
    .where(eq(postLikesTable.postId, postId));

  res.json({ liked, likesCount: count });
});

// ─── POST /api/posts/:id/bookmark ────────────────────────────────────────────
// Toggle a bookmark (save) for the current user.

router.post("/:id/bookmark", requireAuth, async (req, res) => {
  const currentUser = (req as any).currentUser;
  const postId = String(req.params.id);

  const [post] = await db.select({ id: postsTable.id }).from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const [existing] = await db
    .select()
    .from(postBookmarksTable)
    .where(and(eq(postBookmarksTable.postId, postId), eq(postBookmarksTable.userId, currentUser.id)))
    .limit(1);

  let bookmarked: boolean;
  if (existing) {
    await db.delete(postBookmarksTable).where(eq(postBookmarksTable.id, existing.id));
    bookmarked = false;
  } else {
    await db.insert(postBookmarksTable).values({ postId, userId: currentUser.id });
    bookmarked = true;
  }

  res.json({ bookmarked });
});

// ─── GET /api/posts/bookmarks/mine ───────────────────────────────────────────
// Post ids the current user has bookmarked. Used to render the Saved tab.

router.get("/bookmarks/mine", requireAuth, async (req, res) => {
  const currentUser = (req as any).currentUser;

  const rows = await db
    .select({ postId: postBookmarksTable.postId })
    .from(postBookmarksTable)
    .where(eq(postBookmarksTable.userId, currentUser.id));

  res.json({ postIds: rows.map((r: { postId: string }) => r.postId) });
});

// ─── POST /api/posts/:id/share ───────────────────────────────────────────────
// Increment the share counter. No auth required — sharing (via the native
// share sheet) doesn't require a session, it just tracks that a share happened.

router.post("/:id/share", async (req, res) => {
  const postId = String(req.params.id);

  const [post] = await db.select({ id: postsTable.id }).from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const [updated] = await db
    .update(postsTable)
    .set({ sharesCount: sql`${postsTable.sharesCount} + 1` })
    .where(eq(postsTable.id, postId))
    .returning({ sharesCount: postsTable.sharesCount });

  res.json({ sharesCount: updated.sharesCount });
});

// ─── GET /api/posts/:postId/comments ─────────────────────────────────────────
// Public — newest first, matching the client's previous local-state ordering.

router.get("/:postId/comments", async (req, res) => {
  const postId = String(req.params.postId);

  const [post] = await db.select({ id: postsTable.id }).from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const rows = await db
    .select({
      id: commentsTable.id,
      postId: commentsTable.postId,
      body: commentsTable.body,
      replyToHandle: commentsTable.replyToHandle,
      createdAt: commentsTable.createdAt,
      author: {
        id: usersTable.id,
        name: usersTable.name,
        username: usersTable.username,
      },
    })
    .from(commentsTable)
    .innerJoin(usersTable, eq(commentsTable.authorId, usersTable.id))
    .where(eq(commentsTable.postId, postId))
    .orderBy(desc(commentsTable.createdAt));

  res.json({ comments: rows });
});

// ─── POST /api/posts/:postId/comments ────────────────────────────────────────
// Create a comment — requires auth. Author is always the logged-in user.

router.post("/:postId/comments", requireAuth, async (req, res) => {
  const postId = String(req.params.postId);

  const [post] = await db.select({ id: postsTable.id }).from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const parsed = createCommentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const currentUser = (req as any).currentUser;

  const [comment] = await db
    .insert(commentsTable)
    .values({
      postId,
      authorId: currentUser.id,
      body: parsed.data.body,
      replyToHandle: parsed.data.replyToHandle,
    })
    .returning();

  res.status(201).json({
    comment: {
      ...comment,
      author: {
        id: currentUser.id,
        name: currentUser.name,
        username: currentUser.username,
      },
    },
  });
});

export default router;
