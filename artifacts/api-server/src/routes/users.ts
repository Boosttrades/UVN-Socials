import { Router, type IRouter } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { requireAuth, optionalAuth } from "../middlewares/auth";
import { createNotification } from "../lib/notifications";

const router: IRouter = Router();

// ─── GET /api/users/search?q= ────────────────────────────────────────────────

router.get("/search", optionalAuth, async (req, res) => {
  const currentUser = (req as any).currentUser as { id: string } | undefined;
  // Strip leading @ so that "@chidinma" and "chidinma" both match
  const q = String(req.query.q ?? "").trim().replace(/^@+/, "");

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

// ─── GET /api/users/:username/followers ──────────────────────────────────────

router.get("/:username/followers", optionalAuth, async (req, res) => {
  const currentUser = (req as any).currentUser as { id: string } | undefined;
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

  const { data: rows } = await supabaseAdmin
    .from("Follows")
    .select("follower:Profiles!follower_id(Id, name, username, profile_image)")
    .eq("following_id", target.Id)
    .order("created_at", { ascending: false })
    .limit(200);

  const followerIds = (rows ?? []).map((r: any) => r.follower?.Id).filter(Boolean);

  let followingSet = new Set<string>();
  if (currentUser && followerIds.length > 0) {
    const { data: myFollows } = await supabaseAdmin
      .from("Follows")
      .select("following_id")
      .eq("follower_id", currentUser.id)
      .in("following_id", followerIds);
    followingSet = new Set((myFollows ?? []).map((f: any) => f.following_id));
  }

  res.json({
    users: (rows ?? [])
      .filter((r: any) => r.follower)
      .map((r: any) => ({
        id: r.follower.Id,
        name: r.follower.name ?? "",
        username: r.follower.username ?? "",
        profileImage: r.follower.profile_image ?? null,
        isFollowing: followingSet.has(r.follower.Id),
        isMe: currentUser?.id === r.follower.Id,
      })),
  });
});

// ─── GET /api/users/:username/following ──────────────────────────────────────

router.get("/:username/following", optionalAuth, async (req, res) => {
  const currentUser = (req as any).currentUser as { id: string } | undefined;
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

  const { data: rows } = await supabaseAdmin
    .from("Follows")
    .select("following:Profiles!following_id(Id, name, username, profile_image)")
    .eq("follower_id", target.Id)
    .order("created_at", { ascending: false })
    .limit(200);

  const followingIds = (rows ?? []).map((r: any) => r.following?.Id).filter(Boolean);

  let followingSet = new Set<string>();
  if (currentUser && followingIds.length > 0) {
    const { data: myFollows } = await supabaseAdmin
      .from("Follows")
      .select("following_id")
      .eq("follower_id", currentUser.id)
      .in("following_id", followingIds);
    followingSet = new Set((myFollows ?? []).map((f: any) => f.following_id));
  }

  res.json({
    users: (rows ?? [])
      .filter((r: any) => r.following)
      .map((r: any) => ({
        id: r.following.Id,
        name: r.following.name ?? "",
        username: r.following.username ?? "",
        profileImage: r.following.profile_image ?? null,
        isFollowing: followingSet.has(r.following.Id),
        isMe: currentUser?.id === r.following.Id,
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

  // Notify the followed user
  if (following) {
    createNotification({
      recipientId: target.Id,
      actorId: currentUser.id,
      type: "follow",
      message: `started following you`,
    });
  }

  const { count: followersCount } = await supabaseAdmin
    .from("Follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", target.Id);

  res.json({ following, followersCount: followersCount ?? 0 });
});

export default router;
