// Node.js 20 lacks native WebSocket — polyfill before importing Supabase so
// the realtime client initialises without throwing.
import { WebSocket } from "ws";
if (!("WebSocket" in globalThis)) {
  // @ts-ignore — intentional global polyfill
  globalThis.WebSocket = WebSocket;
}

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./logger";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  logger.warn(
    "One or more Supabase env vars are missing (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY)"
  );
}

/**
 * Anon client — RLS policies apply.
 * Use for operations that should respect row-level security.
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl ?? "",
  supabaseAnonKey ?? "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * Admin client — service role key, bypasses RLS.
 * Use for all server-side data operations.
 */
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl ?? "",
  supabaseServiceRoleKey ?? "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Sign in a user via the Supabase REST API (stateless — does not mutate the
 * singleton client's session). Returns the raw Supabase token response or
 * throws on invalid credentials.
 */
export async function signInWithPassword(
  email: string,
  password: string
): Promise<{ access_token: string; refresh_token: string; user: any }> {
  const response = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    }
  );
  const data = (await response.json()) as any;
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? "Invalid credentials");
  }
  return data;
}

/**
 * Refresh an access token using a refresh token via the Supabase REST API.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ access_token: string; refresh_token: string }> {
  const response = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
    {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }
  );
  const data = (await response.json()) as any;
  if (!response.ok || !data.access_token) {
    throw new Error("Token refresh failed");
  }
  return { access_token: data.access_token, refresh_token: data.refresh_token };
}

/**
 * Invalidate a specific session token via the Supabase REST API (logout).
 */
export async function revokeToken(accessToken: string): Promise<void> {
  await fetch(`${supabaseUrl}/auth/v1/logout`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey ?? "",
      Authorization: `Bearer ${accessToken}`,
    },
  }).catch(() => {}); // best-effort
}
