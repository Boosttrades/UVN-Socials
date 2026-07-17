import { randomUUID } from "crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";
import { supabaseAdmin } from "../lib/supabase";

const router: IRouter = Router();

const BUCKET = "media";

/**
 * Ensure the `media` bucket exists in Supabase Storage.
 * Called once at startup — safe to call multiple times (ignores "already exists").
 */
export async function ensureMediaBucket(): Promise<void> {
  const { error } = await supabaseAdmin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 20 * 1024 * 1024, // 20 MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  });
  if (error && !error.message.toLowerCase().includes("already exists")) {
    console.warn("[storage] Could not create media bucket:", error.message);
  }
}

const requestUploadUrlSchema = z.object({
  name: z.string().min(1),
  size: z.number().nonnegative(),
  contentType: z.string().min(1),
});

/**
 * POST /api/storage/uploads/request-url
 *
 * Returns a Supabase Storage signed upload URL. The client PUTs the file
 * directly to `uploadURL`, then uses `publicUrl` as the permanent image URL.
 */
router.post(
  "/uploads/request-url",
  requireAuth,
  async (req: Request, res: Response) => {
    const parsed = requestUploadUrlSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Missing or invalid required fields" });
      return;
    }

    try {
      const ext = parsed.data.contentType.split("/")[1] ?? "jpg";
      const path = `uploads/${randomUUID()}.${ext}`;

      const { data, error } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUploadUrl(path);

      if (error || !data) {
        req.log.error({ err: error }, "Supabase signed upload URL error");
        res.status(500).json({ error: "Failed to generate upload URL" });
        return;
      }

      const supabaseUrl = process.env.SUPABASE_URL!;
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;

      // objectPath kept for legacy GET route compatibility
      res.json({
        uploadURL: data.signedUrl,
        objectPath: `/${path}`,
        publicUrl,
      });
    } catch (error) {
      req.log.error({ err: error }, "Error generating upload URL");
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  }
);

/**
 * GET /api/storage/objects/*
 *
 * Redirects to the Supabase public URL for the object.
 * Keeps backward compatibility with any stored /objects/... paths.
 */
router.get("/objects/*path", async (req: Request, res: Response) => {
  const raw = req.params.path;
  const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;

  const supabaseUrl = process.env.SUPABASE_URL!;
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${wildcardPath}`;
  res.redirect(302, publicUrl);
});

export default router;
