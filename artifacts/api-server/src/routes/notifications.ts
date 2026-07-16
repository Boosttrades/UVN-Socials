import { Router, type IRouter } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// ─── GET /api/notifications ───────────────────────────────────────────────────

router.get("/", requireAuth, async (req, res) => {
  const currentUser = (req as any).currentUser;

  const { data: rows, error } = await supabaseAdmin
    .from("Notifications")
    .select(
      `id, type, post_id, message, read, created_at,
       actor:Profiles!actor_id(Id, name, username, profile_image)`
    )
    .eq("recipient_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    res.status(500).json({ error: "Failed to fetch notifications" });
    return;
  }

  const notifications = (rows ?? []).map((n: any) => ({
    id: n.id,
    type: n.type,
    postId: n.post_id ?? null,
    message: n.message,
    read: n.read,
    createdAt: n.created_at,
    actor: n.actor
      ? {
          id: n.actor.Id,
          name: n.actor.name ?? "",
          username: n.actor.username ?? "",
          profileImage: n.actor.profile_image ?? null,
        }
      : null,
  }));

  res.json({ notifications });
});

// ─── POST /api/notifications/read-all ────────────────────────────────────────

router.post("/read-all", requireAuth, async (req, res) => {
  const currentUser = (req as any).currentUser;

  await supabaseAdmin
    .from("Notifications")
    .update({ read: true })
    .eq("recipient_id", currentUser.id)
    .eq("read", false);

  res.json({ ok: true });
});

// ─── POST /api/notifications/:id/read ────────────────────────────────────────

router.post("/:id/read", requireAuth, async (req, res) => {
  const currentUser = (req as any).currentUser;
  const id = String(req.params.id);

  await supabaseAdmin
    .from("Notifications")
    .update({ read: true })
    .eq("id", id)
    .eq("recipient_id", currentUser.id);

  res.json({ ok: true });
});

export default router;
