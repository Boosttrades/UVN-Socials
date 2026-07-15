import { Router } from "express";
import { supabase } from "../lib/supabase";
import { logger } from "../lib/logger";

const router = Router();

/**
 * GET /api/supabase/ping
 *
 * Read-only connectivity test — fetches a single row from the `profiles`
 * table to confirm the Supabase client is correctly configured and the
 * database is reachable. Does not mutate any data.
 */
router.get("/ping", async (_req, res) => {
  try {
    const start = Date.now();

    const { data, error, status } = await supabase
      .from("Profiles")
      .select("Id")
      .limit(1);

    const latencyMs = Date.now() - start;

    if (error) {
      logger.error({ error, status }, "Supabase ping failed");
      res.status(502).json({
        ok: false,
        error: error.message,
        hint: error.hint ?? null,
        status,
      });
      return;
    }

    logger.info({ latencyMs, rows: data?.length ?? 0 }, "Supabase ping ok");
    res.json({
      ok: true,
      latencyMs,
      rowsReturned: data?.length ?? 0,
      message: "Supabase connection is working correctly",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "Supabase ping threw unexpectedly");
    res.status(500).json({ ok: false, error: message });
  }
});

export default router;
