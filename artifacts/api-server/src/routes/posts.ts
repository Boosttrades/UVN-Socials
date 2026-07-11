import { Router, type IRouter } from "express";
import { db, postsTable, usersTable, createPostSchema } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// ─── GET /api/posts ──────────────────────────────────────────────────────────
// Public feed — newest first. No auth required to read.

router.get("/", async (_req, res) => {
  const rows = await db
    .select({
      id: postsTable.id,
      type: postsTable.type,
      category: postsTable.category,
      headline: postsTable.headline,
      body: postsTable.body,
      isEmergency: postsTable.isEmergency,
      createdAt: postsTable.createdAt,
      author: {
        id: usersTable.id,
        name: usersTable.name,
        username: usersTable.username,
      },
    })
    .from(postsTable)
    .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
    .orderBy(desc(postsTable.createdAt));

  res.json({ posts: rows });
});

// ─── POST /api/posts ──────────────────────────────────────────────────────────
// Create a post — requires auth. Author is always the logged-in user.

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
      isEmergency: parsed.data.isEmergency ?? false,
    })
    .returning();

  res.status(201).json({
    post: {
      ...post,
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

export default router;
