import { supabaseAdmin } from "./supabase";

export type NotificationType =
  | "like"
  | "comment"
  | "follow"
  | "mention"
  | "system"
  | "verification";

/**
 * Fire-and-forget: insert one notification row.
 * Skips silently if actor === recipient (no self-notifications).
 */
export function createNotification(opts: {
  recipientId: string;
  actorId: string;
  type: NotificationType;
  postId?: string;
  message: string;
}): void {
  if (opts.recipientId === opts.actorId) return; // no self-notify

  supabaseAdmin
    .from("Notifications")
    .insert({
      recipient_id: opts.recipientId,
      actor_id: opts.actorId,
      type: opts.type,
      post_id: opts.postId ?? null,
      message: opts.message,
    })
    .then(({ error }) => {
      if (error) console.warn("[notifications] insert failed:", error.message);
    });
}
