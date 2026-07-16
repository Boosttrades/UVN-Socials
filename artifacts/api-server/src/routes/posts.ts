import { Router, type IRouter } from "express";
import { supabaseAdmin } from "../lib/supabase";
import {
  createPostSchema,
  createCommentSchema,
} from "@workspace/db/schema";
import { requireAuth, optionalAuth } from "../middlewares/auth";
import { createNotification } from "../lib/notifications";

const router: IRouter = Router();

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

// ─── GET /api/posts ──────────────────────────────────────────────────────────

router.get("/", optionalAuth, async (req, res) => {
  const currentUser = (req as any).currentUser as { id: string } | undefined;

  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(String(req.query.limit ?? DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)
  );

  // Build paginated query against Supabase
  let query = supabaseAdmin
    .from("Post")
    .select(
      `id, type, category, headline, text, image_url, is_emergency, shares_count, created_at,
       author:Profiles!user_id(Id, name, username)`
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  // Keyset cursor: `<createdAt ISO>_<id>`
  const rawCursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
  if (rawCursor) {
    const sep = rawCursor.lastIndexOf("_");
    const cursorCreatedAt = sep >= 0 ? rawCursor.slice(0, sep) : undefined;
    const cursorId = sep >= 0 ? rawCursor.slice(sep + 1) : undefined;
    if (cursorCreatedAt && cursorId && !isNaN(new Date(cursorCreatedAt).getTime())) {
      query = query.or(
        `created_at.lt.${cursorCreatedAt},and(created_at.eq.${cursorCreatedAt},id.lt.${cursorId})`
      );
    }
  }

  const { data: rawPosts, error: postsError } = await query;
  if (postsError) {
    res.status(500).json({ error: "Failed to fetch posts" });
    return;
  }

  const hasMore = (rawPosts?.length ?? 0) > limit;
  const page = (rawPosts ?? []).slice(0, limit);

  if (page.length === 0) {
    res.json({ posts: [], nextCursor: null });
    return;
  }

  const postIds = page.map((p: any) => p.id);

  // Batch-fetch counts and per-user state in parallel
  const [
    { data: allLikes },
    { data: allComments },
    { data: userLikes },
    { data: userBookmarks },
  ] = await Promise.all([
    supabaseAdmin.from("Likes").select("post_id").in("post_id", postIds),
    supabaseAdmin.from("Comments").select("post_id").in("post_id", postIds),
    currentUser
      ? supabaseAdmin
          .from("Likes")
          .select("post_id")
          .eq("user_id", currentUser.id)
          .in("post_id", postIds)
      : Promise.resolve({ data: [] }),
    currentUser
      ? supabaseAdmin
          .from("Bookmarks")
          .select("post_id")
          .eq("user_id", currentUser.id)
          .in("post_id", postIds)
      : Promise.resolve({ data: [] }),
  ]);

  // Build lookup maps
  const likesCountMap = new Map<string, number>();
  const commentsCountMap = new Map<string, number>();
  for (const l of allLikes ?? []) {
    likesCountMap.set(l.post_id, (likesCountMap.get(l.post_id) ?? 0) + 1);
  }
  for (const c of allComments ?? []) {
    commentsCountMap.set(c.post_id, (commentsCountMap.get(c.post_id) ?? 0) + 1);
  }
  const likedSet = new Set((userLikes ?? []).map((l: any) => l.post_id));
  const bookmarkedSet = new Set((userBookmarks ?? []).map((b: any) => b.post_id));

  const posts = page.map((p: any) => ({
    id: p.id,
    type: p.type ?? "update",
    category: p.category ?? null,
    headline: p.headline ?? p.text ?? "",
    body: p.text ?? null,
    imageUrl: p.image_url ?? null,
    isEmergency: p.is_emergency ?? false,
    sharesCount: p.shares_count ?? 0,
    createdAt: p.created_at,
    author: {
      id: p.author?.Id ?? "",
      name: p.author?.name ?? "",
      username: p.author?.username ?? "",
    },
    likesCount: likesCountMap.get(p.id) ?? 0,
    commentsCount: commentsCountMap.get(p.id) ?? 0,
    isLiked: likedSet.has(p.id),
    isBookmarked: bookmarkedSet.has(p.id),
  }));

  const last = posts[posts.length - 1];
  const nextCursor =
    hasMore && last
      ? `${new Date(last.createdAt).toISOString()}_${last.id}`
      : null;

  res.json({ posts, nextCursor });
});

// ─── POST /api/posts ──────────────────────────────────────────────────────────

router.post("/", requireAuth, async (req, res) => {
  const parsed = createPostSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const currentUser = (req as any).currentUser;

  const { data: post, error } = await supabaseAdmin
    .from("Post")
    .insert({
      user_id: currentUser.id,
      headline: parsed.data.headline,
      text: parsed.data.body ?? null,
      image_url: parsed.data.imageUrl ?? null,
      type: parsed.data.type,
      category: parsed.data.category ?? null,
      is_emergency: parsed.data.isEmergency ?? false,
      shares_count: 0,
    })
    .select()
    .single();

  if (error || !post) {
    res.status(500).json({ error: "Failed to create post" });
    return;
  }

  res.status(201).json({
    post: {
      id: post.id,
      type: post.type ?? "update",
      category: post.category ?? null,
      headline: post.headline ?? post.text ?? "",
      body: post.text ?? null,
      imageUrl: post.image_url ?? null,
      isEmergency: post.is_emergency ?? false,
      sharesCount: 0,
      createdAt: post.created_at,
      author: {
        id: currentUser.id,
        name: currentUser.name,
        username: currentUser.username,
      },
      likesCount: 0,
      commentsCount: 0,
      isLiked: false,
      isBookmarked: false,
    },
  });
});

// ─── DELETE /api/posts/:id ────────────────────────────────────────────────────

router.delete("/:id", requireAuth, async (req, res) => {
  const currentUser = (req as any).currentUser;
  const id = String(req.params.id);

  const { data: existing } = await supabaseAdmin
    .from("Post")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  if (existing.user_id !== currentUser.id) {
    res.status(403).json({ error: "You can only delete your own posts" });
    return;
  }

  await supabaseAdmin.from("Post").delete().eq("id", id);

  res.json({ message: "Post deleted" });
});

// ─── POST /api/posts/:id/like ────────────────────────────────────────────────

router.post("/:id/like", requireAuth, async (req, res) => {
  const currentUser = (req as any).currentUser;
  const postId = String(req.params.id);

  const { data: post } = await supabaseAdmin
    .from("Post")
    .select("id, user_id")
    .eq("id", postId)
    .maybeSingle();

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const { data: existing } = await supabaseAdmin
    .from("Likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", currentUser.id)
    .maybeSingle();

  let liked: boolean;
  if (existing) {
    await supabaseAdmin.from("Likes").delete().eq("id", existing.id);
    liked = false;
  } else {
    await supabaseAdmin.from("Likes").insert({ post_id: postId, user_id: currentUser.id });
    liked = true;
  }

  // Notify post author when someone likes their post
  if (liked) {
    createNotification({
      recipientId: post.user_id,
      actorId: currentUser.id,
      type: "like",
      postId,
      message: `liked your post`,
    });
  }

  const { count } = await supabaseAdmin
    .from("Likes")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId);

  res.json({ liked, likesCount: count ?? 0 });
});

// ─── POST /api/posts/:id/bookmark ────────────────────────────────────────────

router.post("/:id/bookmark", requireAuth, async (req, res) => {
  const currentUser = (req as any).currentUser;
  const postId = String(req.params.id);

  const { data: post } = await supabaseAdmin
    .from("Post")
    .select("id")
    .eq("id", postId)
    .maybeSingle();

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const { data: existing } = await supabaseAdmin
    .from("Bookmarks")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", currentUser.id)
    .maybeSingle();

  let bookmarked: boolean;
  if (existing) {
    await supabaseAdmin.from("Bookmarks").delete().eq("id", existing.id);
    bookmarked = false;
  } else {
    await supabaseAdmin.from("Bookmarks").insert({ post_id: postId, user_id: currentUser.id });
    bookmarked = true;
  }

  res.json({ bookmarked });
});

// ─── GET /api/posts/bookmarks/mine ───────────────────────────────────────────

router.get("/bookmarks/mine", requireAuth, async (req, res) => {
  const currentUser = (req as any).currentUser;

  const { data: rows } = await supabaseAdmin
    .from("Bookmarks")
    .select("post_id")
    .eq("user_id", currentUser.id);

  res.json({ postIds: (rows ?? []).map((r: any) => r.post_id) });
});

// ─── POST /api/posts/:id/share ───────────────────────────────────────────────

router.post("/:id/share", async (req, res) => {
  const postId = String(req.params.id);

  const { data: post } = await supabaseAdmin
    .from("Post")
    .select("id, shares_count")
    .eq("id", postId)
    .maybeSingle();

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const newCount = (post.shares_count ?? 0) + 1;
  await supabaseAdmin
    .from("Post")
    .update({ shares_count: newCount })
    .eq("id", postId);

  res.json({ sharesCount: newCount });
});

// ─── GET /api/posts/:postId/comments ─────────────────────────────────────────

router.get("/:postId/comments", async (req, res) => {
  const postId = String(req.params.postId);

  const { data: post } = await supabaseAdmin
    .from("Post")
    .select("id")
    .eq("id", postId)
    .maybeSingle();

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const { data: rows } = await supabaseAdmin
    .from("Comments")
    .select(`
      id, post_id, text, reply_to_handle, created_at,
      author:Profiles!user_id(Id, name, username)
    `)
    .eq("post_id", postId)
    .order("created_at", { ascending: false });

  const comments = (rows ?? []).map((c: any) => ({
    id: c.id,
    postId: c.post_id,
    body: c.text,
    replyToHandle: c.reply_to_handle ?? null,
    createdAt: c.created_at,
    author: {
      id: c.author?.Id ?? "",
      name: c.author?.name ?? "",
      username: c.author?.username ?? "",
    },
  }));

  res.json({ comments });
});

// ─── POST /api/posts/:postId/comments ────────────────────────────────────────

router.post("/:postId/comments", requireAuth, async (req, res) => {
  const postId = String(req.params.postId);
  const currentUser = (req as any).currentUser;

  const { data: post } = await supabaseAdmin
    .from("Post")
    .select("id, user_id")
    .eq("id", postId)
    .maybeSingle();

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const parsed = createCommentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const { data: comment, error } = await supabaseAdmin
    .from("Comments")
    .insert({
      post_id: postId,
      user_id: currentUser.id,
      text: parsed.data.body,
      reply_to_handle: parsed.data.replyToHandle ?? null,
    })
    .select()
    .single();

  if (error || !comment) {
    res.status(500).json({ error: "Failed to create comment" });
    return;
  }

  // Notify post author when someone comments
  createNotification({
    recipientId: post.user_id,
    actorId: currentUser.id,
    type: "comment",
    postId,
    message: `commented on your post`,
  });

  res.status(201).json({
    comment: {
      id: comment.id,
      postId: comment.post_id,
      body: comment.text,
      replyToHandle: comment.reply_to_handle ?? null,
      createdAt: comment.created_at,
      author: {
        id: currentUser.id,
        name: currentUser.name,
        username: currentUser.username,
      },
    },
  });
});

export default router;
