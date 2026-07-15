import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./logger";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  logger.warn(
    "SUPABASE_URL or SUPABASE_ANON_KEY is not set — Supabase client will not function"
  );
}

/**
 * Supabase client using the anonymous key.
 * RLS policies on your Supabase project apply to all queries made through this client.
 * Configured via:
 *   SUPABASE_URL     — your project URL (e.g. https://xxxx.supabase.co)
 *   SUPABASE_ANON_KEY — your project's anon/public key
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl ?? "",
  supabaseAnonKey ?? ""
);
