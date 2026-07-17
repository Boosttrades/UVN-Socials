import { type NextFunction, type Request, type Response } from "express";
import { supabaseAdmin } from "../lib/supabase";

export type AuthUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  emailVerified: boolean;
  profileImage: string | null;
  profileUpdatedAt: string | null;
  createdAt: string;
};

/**
 * Validate a Supabase JWT and return the user's profile from the Profiles
 * table. Returns null if the token is invalid or the profile is missing.
 */
async function resolveUser(token: string): Promise<AuthUser | null> {
  // Validate the JWT via Supabase Auth (does not mutate client state)
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;

  // Fetch full profile from Supabase Profiles table
  const { data: profile } = await supabaseAdmin
    .from("Profiles")
    .select("Id, name, username, email, profile_image, profile_updated_at, created_at")
    .eq("Id", user.id)
    .maybeSingle();

  if (!profile) return null;

  return {
    id: profile.Id,
    name: profile.name ?? user.user_metadata?.name ?? "",
    username: profile.username ?? "",
    email: profile.email ?? user.email ?? "",
    emailVerified: !!user.email_confirmed_at,
    profileImage: profile.profile_image ?? null,
    profileUpdatedAt: profile.profile_updated_at ?? null,
    createdAt: profile.created_at ?? user.created_at,
  };
}

/**
 * Require a valid Supabase JWT. Attaches `currentUser` and `sessionToken` to
 * the request or responds 401.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  const user = await resolveUser(token);

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  (req as any).currentUser = user;
  (req as any).sessionToken = token;
  next();
}

/**
 * Like requireAuth but never blocks the request. Attaches the user to the
 * request only if a valid token is present — allows public endpoints to
 * optionally enrich responses with per-user state.
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authHeader.slice(7);
  const user = await resolveUser(token);

  if (user) {
    (req as any).currentUser = user;
    (req as any).sessionToken = token;
  }

  next();
}
