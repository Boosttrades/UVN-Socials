import { Router, type IRouter } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { db, followsTable } from "@workspace/db";
import { requireAuth, optionalAuth } from "../middlewares/auth";

const router: IRouter = Router();

/** Fire-and-forget background sync to Replit Postgres. */
function syncToReplit(fn: () => Promise<void>): void {
  fn().catch((err) =>
    console.warn("[replit-sync] Background sync failed:", err?.message)
  );
}

// ─── GET /api/users/search?q= ────────────────────────────────────────────────

router.get("/search", optionalAuth, async (req, res) => {
  const currentUser = (req as any).currentUser as { id: string } | undefined;
  const q = String(req.query.q ?? "").trim();

  if (!q) {
    res.json({ users: [] });
    return;
  }

  // Supabase ilike filter for partial name/username match
  const { data: results } = await supabaseAdmin
    .from("Profiles")
    .select("Id, name, username")
    .or(`name.ilike.%${q}%,username.ilike.%${q}%`)
    .order("name")
    .limit(20);

  if (!results || results.length === 0) {
    res.json({ users: [] });
    return;
  }

  // Determine which of these users the caller follows
  let followingSet = new Set<string>();
  if (currentUser) {
    const { data: following } = await supabaseAdmin
      .from("Follows")
      .select("following_id")
      .eq("follower_id", currentUser.id)
      .in("following_id", results.map((u: any) => u.Id));
    followingSet = new Set((following ?? []).map((f: any) => f.following_id));
  }

  res.json({
    users: results.map((u: any) => ({
      id: u.Id,
      name: u.name ?? "",
      username: u.username ?? "",
      isFollowing: followingSet.has(u.Id),
      isMe: currentUser?.id === u.Id,
    })),
  });
});

// ─── GET /api/users/:username ────────────────────────────────────────────────

router.get("/:username", optionalAuth, async (req, res) => {
  const currentUser = (req as any).currentUser as { id: string } | undefined;
  const username = String(req.params.username);

  const { data: user } = await supabaseAdmin
    .from("Profiles")
    .select("Id, name, username, profile_image")
    .eq("username", username)
    .maybeSingle();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Fetch counts and follow status in parallel
  const [
    { count: followersCount },
    { count: followingCount },
    { count: postsCount },
    followCheck,
  ] = await Promise.all([
    supabaseAdmin
      .from("Follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", user.Id),
    supabaseAdmin
      .from("Follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", user.Id),
    supabaseAdmin
      .from("Post")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.Id),
    currentUser
      ? supabaseAdmin
          .from("Follows")
          .select("id")
          .eq("follower_id", currentUser.id)
          .eq("following_id", user.Id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  res.json({
    user: {
      id: user.Id,
      name: user.name ?? "",
      username: user.username,
      profileImage: user.profile_image ?? null,
      followersCount: followersCount ?? 0,
      followingCount: followingCount ?? 0,
      postsCount: postsCount ?? 0,
      isFollowing: !!(followCheck as any)?.data,
    },
  });
});

// ─── POST /api/users/:username/follow ────────────────────────────────────────

router.post("/:username/follow", requireAuth, async (req, res) => {
  const currentUser = (req as any).currentUser;
  const username = String(req.params.username);

  const { data: target } = await supabaseAdmin
    .from("Profiles")
    .select("Id")
    .eq("username", username)
    .maybeSingle();

  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (target.Id === currentUser.id) {
    res.status(400).json({ error: "You cannot follow yourself" });
    return;
  }

  const { data: existing } = await supabaseAdmin
    .from("Follows")
    .select("id")
    .eq("follower_id", currentUser.id)
    .eq("following_id", target.Id)
    .maybeSingle();

  let following: boolean;
  if (existing) {
    await supabaseAdmin.from("Follows").delete().eq("id", existing.id);
    following = false;
  } else {
    await supabaseAdmin
      .from("Follows")
      .insert({ follower_id: currentUser.id, following_id: target.Id });
    following = true;
  }

  const { count: followersCount } = await supabaseAdmin
    .from("Follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", target.Id);

  syncToReplit(async () => {
    const { and, eq } = await import("drizzle-orm");
    if (following) {
      await db
        .insert(followsTable)
        .values({ followerId: currentUser.id, followingId: target.Id })
        .onConflictDoNothing();
    } else {
      await db.delete(followsTable).where(
        and(
          eq(followsTable.followerId, currentUser.id),
          eq(followsTable.followingId, target.Id)
        )
      );
    }
  });

  res.json({ following, followersCount: followersCount ?? 0 });
});

export default router;
