import { Router, type IRouter } from "express";
import { db, usersTable, postsTable, followsTable } from "@workspace/db";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { requireAuth, optionalAuth } from "../middlewares/auth";

const router: IRouter = Router();

// ─── GET /api/users/search?q= ────────────────────────────────────────────────
// People search by name or username (case-insensitive, partial match).
// Registered before the `/:username` route below so "search" is never
// mistaken for a username lookup.

router.get("/search", optionalAuth, async (req, res) => {
  const currentUser = (req as any).currentUser as { id: string } | undefined;
  const q = String(req.query.q ?? "").trim();

  if (!q) {
    res.json({ users: [] });
    return;
  }

  const pattern = `%${q}%`;
  const results = await db
    .select({ id: usersTable.id, name: usersTable.name, username: usersTable.username })
    .from(usersTable)
    .where(or(sql`${usersTable.name} ILIKE ${pattern}`, sql`${usersTable.username} ILIKE ${pattern}`))
    .orderBy(usersTable.name)
    .limit(20);

  let followingIds = new Set<string>();
  if (currentUser && results.length > 0) {
    const rows = await db
      .select({ followingId: followsTable.followingId })
      .from(followsTable)
      .where(
        and(
          eq(followsTable.followerId, currentUser.id),
          inArray(
            followsTable.followingId,
            results.map((u) => u.id)
          )
        )
      );
    followingIds = new Set(rows.map((r) => r.followingId));
  }

  res.json({
    users: results.map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      isFollowing: followingIds.has(u.id),
      isMe: currentUser?.id === u.id,
    })),
  });
});

// ─── GET /api/users/:username ────────────────────────────────────────────────
// Public profile lookup by username — includes follower/following/post counts
// and, if the caller is authenticated, whether they follow this user.

router.get("/:username", optionalAuth, async (req, res) => {
  const currentUser = (req as any).currentUser as { id: string } | undefined;
  const username = String(req.params.username);

  const [user] = await db
    .select({ id: usersTable.id, name: usersTable.name, username: usersTable.username })
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [{ followersCount }] = await db
    .select({ followersCount: sql<number>`count(*)::int` })
    .from(followsTable)
    .where(eq(followsTable.followingId, user.id));

  const [{ followingCount }] = await db
    .select({ followingCount: sql<number>`count(*)::int` })
    .from(followsTable)
    .where(eq(followsTable.followerId, user.id));

  const [{ postsCount }] = await db
    .select({ postsCount: sql<number>`count(*)::int` })
    .from(postsTable)
    .where(eq(postsTable.authorId, user.id));

  let isFollowing = false;
  if (currentUser) {
    const [existing] = await db
      .select()
      .from(followsTable)
      .where(and(eq(followsTable.followerId, currentUser.id), eq(followsTable.followingId, user.id)))
      .limit(1);
    isFollowing = !!existing;
  }

  res.json({
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      followersCount,
      followingCount,
      postsCount,
      isFollowing,
    },
  });
});

// ─── POST /api/users/:username/follow ────────────────────────────────────────
// Toggle following this user. Requires auth. Cannot follow yourself.

router.post("/:username/follow", requireAuth, async (req, res) => {
  const currentUser = (req as any).currentUser;
  const username = String(req.params.username);

  const [target] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .limit(1);

  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (target.id === currentUser.id) {
    res.status(400).json({ error: "You cannot follow yourself" });
    return;
  }

  const [existing] = await db
    .select()
    .from(followsTable)
    .where(and(eq(followsTable.followerId, currentUser.id), eq(followsTable.followingId, target.id)))
    .limit(1);

  let following: boolean;
  if (existing) {
    await db.delete(followsTable).where(eq(followsTable.id, existing.id));
    following = false;
  } else {
    await db.insert(followsTable).values({ followerId: currentUser.id, followingId: target.id });
    following = true;
  }

  const [{ followersCount }] = await db
    .select({ followersCount: sql<number>`count(*)::int` })
    .from(followsTable)
    .where(eq(followsTable.followingId, target.id));

  res.json({ following, followersCount });
});

export default router;
