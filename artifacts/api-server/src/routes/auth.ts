import { randomBytes } from "crypto";
import { Router, type IRouter } from "express";
import { supabaseAdmin, signInWithPassword, refreshAccessToken, revokeToken } from "../lib/supabase";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  updateProfileSchema,
} from "@workspace/db/schema";
import { sendPasswordResetEmail, sendVerificationEmail } from "../lib/email";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

function verificationExpiresAt(): Date {
  const d = new Date();
  d.setHours(d.getHours() + 24);
  return d;
}

function resetExpiresAt(): Date {
  const d = new Date();
  d.setHours(d.getHours() + 1);
  return d;
}

function getAppBaseUrl(req: any): string {
  const proto = req.headers["x-forwarded-proto"] ?? "https";
  const host = req.headers["x-forwarded-host"] ?? req.headers["host"];
  return `${proto}://${host}`;
}

function getWebAppBaseUrl(): string {
  const domain = process.env.REPLIT_DEV_DOMAIN;
  return domain ? `https://${domain}` : "http://localhost:8000";
}

const PROFILE_EDIT_COOLDOWN_DAYS = 14;
const WRONG_CREDENTIALS_MSG = "Wrong email/username or password";

// ─── POST /api/auth/signup ───────────────────────────────────────────────────

router.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const { name, username, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();
  const normalizedUsername = username.toLowerCase();

  // Check username uniqueness in Supabase
  const { data: existingUsername } = await supabaseAdmin
    .from("Profiles")
    .select("Id")
    .eq("username", normalizedUsername)
    .maybeSingle();

  if (existingUsername) {
    res.status(409).json({ error: "Username is already taken" });
    return;
  }

  // Create the auth user in Supabase (does NOT confirm email yet)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: false,
    user_metadata: { name, username: normalizedUsername },
  });

  if (authError) {
    if (authError.message?.toLowerCase().includes("already registered")) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }
    res.status(500).json({ error: "Failed to create account. Please try again." });
    return;
  }

  const userId = authData.user.id;

  // The DB trigger auto-creates the Profiles row. We upsert to fill in name
  // and the custom verification token we'll email ourselves.
  const verificationToken = generateToken();
  const verificationTokenExpiresAt = verificationExpiresAt();

  await supabaseAdmin.from("Profiles").upsert({
    Id: userId,
    username: normalizedUsername,
    email: normalizedEmail,
    name,
    verification_token: verificationToken,
    verification_token_expires_at: verificationTokenExpiresAt.toISOString(),
  });

  // Send verification email via our Resend integration
  const verificationUrl = `${getAppBaseUrl(req)}/api/auth/verify?token=${verificationToken}`;
  try {
    await sendVerificationEmail({ to: normalizedEmail, name, verificationUrl });
  } catch (err) {
    req.log?.error?.({ err }, "Failed to send verification email");
  }

  res.status(201).json({
    message: "Account created! Check your email to verify your account.",
    user: { id: userId, name, username: normalizedUsername, email: normalizedEmail },
  });
});

// ─── POST /api/auth/login ────────────────────────────────────────────────────

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  let { identifier, password } = parsed.data;
  identifier = identifier.trim().toLowerCase();

  // Resolve username → email (Supabase signIn only accepts email)
  let email = identifier;
  if (!identifier.includes("@")) {
    const { data: profile } = await supabaseAdmin
      .from("Profiles")
      .select("email")
      .eq("username", identifier)
      .maybeSingle();

    if (!profile) {
      res.status(401).json({ error: WRONG_CREDENTIALS_MSG });
      return;
    }
    email = profile.email;
  }

  // Authenticate via Supabase (stateless REST call)
  let session: { access_token: string; refresh_token: string; user: any };
  try {
    session = await signInWithPassword(email, password);
  } catch {
    res.status(401).json({ error: WRONG_CREDENTIALS_MSG });
    return;
  }

  // Check email verification status
  if (!session.user.email_confirmed_at) {
    // Revoke the session — unverified users must not stay signed in
    await revokeToken(session.access_token);
    res.status(403).json({
      error: "Please verify your email before logging in.",
      code: "EMAIL_NOT_VERIFIED",
      email,
    });
    return;
  }

  // Fetch profile for the response shape the Expo app expects
  const { data: profile } = await supabaseAdmin
    .from("Profiles")
    .select("Id, name, username, email, profile_image, profile_updated_at, created_at")
    .eq("Id", session.user.id)
    .maybeSingle();

  res.json({
    token: session.access_token,
    refreshToken: session.refresh_token,
    user: {
      id: session.user.id,
      name: profile?.name ?? session.user.user_metadata?.name ?? "",
      username: profile?.username ?? "",
      email: profile?.email ?? email,
      emailVerified: true,
      profileImage: profile?.profile_image ?? null,
      profileUpdatedAt: profile?.profile_updated_at ?? null,
      createdAt: profile?.created_at ?? session.user.created_at,
    },
  });
});

// ─── POST /api/auth/refresh ──────────────────────────────────────────────────

router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken || typeof refreshToken !== "string") {
    res.status(400).json({ error: "refreshToken is required" });
    return;
  }

  try {
    const tokens = await refreshAccessToken(refreshToken);
    res.json({ token: tokens.access_token, refreshToken: tokens.refresh_token });
  } catch {
    res.status(401).json({ error: "Session expired. Please log in again." });
  }
});

// ─── GET /api/auth/verify?token=... ─────────────────────────────────────────

router.get("/verify", async (req, res) => {
  const token = req.query["token"];
  if (!token || typeof token !== "string") {
    res.status(400).send(htmlPage("Invalid Link", "This verification link is invalid.", false));
    return;
  }

  const now = new Date().toISOString();

  const { data: profile } = await supabaseAdmin
    .from("Profiles")
    .select("Id, name, verification_token_expires_at")
    .eq("verification_token", token)
    .maybeSingle();

  if (
    !profile ||
    (profile.verification_token_expires_at &&
      profile.verification_token_expires_at < now)
  ) {
    res.status(400).send(
      htmlPage(
        "Link Expired",
        "This verification link has expired or is invalid. Please sign up again.",
        false
      )
    );
    return;
  }

  // Confirm email in Supabase Auth
  await supabaseAdmin.auth.admin.updateUserById(profile.Id, {
    email_confirm: true,
  });

  // Clear the verification token from Profiles
  await supabaseAdmin
    .from("Profiles")
    .update({ verification_token: null, verification_token_expires_at: null })
    .eq("Id", profile.Id);

  res.send(
    htmlPage(
      "Email Verified! ✓",
      `Welcome to Ughelli Vibes, ${profile.name ?? ""}! Your account is now active. Open the app and log in.`,
      true
    )
  );
});

// ─── POST /api/auth/resend-verification ─────────────────────────────────────

router.post("/resend-verification", async (req, res) => {
  const email = req.body?.email;
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const genericMessage =
    "If that account exists and is unverified, a new link has been sent.";

  const { data: profile } = await supabaseAdmin
    .from("Profiles")
    .select("Id, name, email")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  if (!profile) {
    res.json({ message: genericMessage });
    return;
  }

  // Don't resend if already verified
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.Id);
  if (authUser?.user?.email_confirmed_at) {
    res.json({ message: genericMessage });
    return;
  }

  const verificationToken = generateToken();
  const verificationTokenExpiresAt = verificationExpiresAt();

  await supabaseAdmin.from("Profiles").update({
    verification_token: verificationToken,
    verification_token_expires_at: verificationTokenExpiresAt.toISOString(),
  }).eq("Id", profile.Id);

  const verificationUrl = `${getAppBaseUrl(req)}/api/auth/verify?token=${verificationToken}`;
  try {
    await sendVerificationEmail({
      to: profile.email,
      name: profile.name ?? "",
      verificationUrl,
    });
  } catch (err) {
    req.log?.error?.({ err }, "Failed to send verification email");
  }

  res.json({ message: genericMessage });
});

// ─── POST /api/auth/forgot-password ─────────────────────────────────────────

router.post("/forgot-password", async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A valid email is required" });
    return;
  }

  const { email } = parsed.data;
  const genericMessage =
    "If that account exists, a password reset link has been sent.";

  const { data: profile } = await supabaseAdmin
    .from("Profiles")
    .select("Id, name, email")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (!profile) {
    res.json({ message: genericMessage });
    return;
  }

  const resetToken = generateToken();
  const resetTokenExpiresAt = resetExpiresAt();

  await supabaseAdmin.from("Profiles").update({
    reset_token: resetToken,
    reset_token_expires_at: resetTokenExpiresAt.toISOString(),
  }).eq("Id", profile.Id);

  const resetUrl = `${getWebAppBaseUrl()}/auth/reset-password?token=${resetToken}`;
  try {
    await sendPasswordResetEmail({
      to: profile.email,
      name: profile.name ?? "",
      resetUrl,
    });
  } catch (err) {
    req.log?.error?.({ err }, "Failed to send password reset email");
  }

  res.json({ message: genericMessage });
});

// ─── POST /api/auth/reset-password ──────────────────────────────────────────

router.post("/reset-password", async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const { token, password } = parsed.data;
  const now = new Date().toISOString();

  const { data: profile } = await supabaseAdmin
    .from("Profiles")
    .select("Id, reset_token_expires_at")
    .eq("reset_token", token)
    .maybeSingle();

  if (!profile) {
    res
      .status(400)
      .json({ error: "This reset link has expired or is invalid. Please request a new one." });
    return;
  }

  if (profile.reset_token_expires_at && profile.reset_token_expires_at < now) {
    res
      .status(400)
      .json({ error: "This reset link has expired or is invalid. Please request a new one." });
    return;
  }

  // Update password in Supabase Auth
  await supabaseAdmin.auth.admin.updateUserById(profile.Id, { password });

  // Clear reset token
  await supabaseAdmin
    .from("Profiles")
    .update({ reset_token: null, reset_token_expires_at: null })
    .eq("Id", profile.Id);

  res.json({ message: "Your password has been reset. You can now log in." });
});

// ─── POST /api/auth/logout ───────────────────────────────────────────────────

router.post("/logout", requireAuth, async (req, res) => {
  const token = (req as any).sessionToken as string;
  await revokeToken(token);
  res.json({ message: "Logged out" });
});

// ─── GET /api/auth/me ────────────────────────────────────────────────────────

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: (req as any).currentUser });
});

// ─── PATCH /api/auth/profile ─────────────────────────────────────────────────

router.patch("/profile", requireAuth, async (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const currentUser = (req as any).currentUser;
  const { name, username, password } = parsed.data;

  // Verify current password (stateless REST call)
  try {
    await signInWithPassword(currentUser.email, password);
  } catch {
    res.status(401).json({ error: "Incorrect password" });
    return;
  }

  // Enforce 14-day cooldown
  if (currentUser.profileUpdatedAt) {
    const nextAllowed = new Date(currentUser.profileUpdatedAt);
    nextAllowed.setDate(nextAllowed.getDate() + PROFILE_EDIT_COOLDOWN_DAYS);
    if (nextAllowed.getTime() > Date.now()) {
      res.status(429).json({
        error: `You can change your name or username again on ${nextAllowed.toLocaleDateString()}.`,
        code: "PROFILE_EDIT_COOLDOWN",
        nextAllowedAt: nextAllowed.toISOString(),
      });
      return;
    }
  }

  const normalizedUsername = username?.toLowerCase();

  // Ensure username isn't taken
  if (normalizedUsername && normalizedUsername !== currentUser.username) {
    const { data: existing } = await supabaseAdmin
      .from("Profiles")
      .select("Id")
      .eq("username", normalizedUsername)
      .maybeSingle();

    if (existing) {
      res.status(409).json({ error: "Username is already taken" });
      return;
    }
  }

  const nowIso = new Date().toISOString();

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("Profiles")
    .update({
      ...(name !== undefined ? { name } : {}),
      ...(normalizedUsername !== undefined ? { username: normalizedUsername } : {}),
      profile_updated_at: nowIso,
    })
    .eq("Id", currentUser.id)
    .select("Id, name, username, email, profile_image, profile_updated_at, created_at")
    .single();

  if (updateError || !updated) {
    res.status(500).json({ error: "Failed to update profile" });
    return;
  }

  const updatedUser = {
    id: updated.Id,
    name: updated.name,
    username: updated.username,
    email: updated.email,
    emailVerified: true,
    profileImage: updated.profile_image ?? null,
    profileUpdatedAt: updated.profile_updated_at,
    createdAt: updated.created_at,
  };

  res.json({ message: "Profile updated", user: updatedUser });
});

// ─── PATCH /api/auth/profile-image ───────────────────────────────────────────

router.patch("/profile-image", requireAuth, async (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl || typeof imageUrl !== "string") {
    res.status(400).json({ error: "imageUrl is required" });
    return;
  }

  const currentUser = (req as any).currentUser;

  const { error } = await supabaseAdmin
    .from("Profiles")
    .update({ profile_image: imageUrl })
    .eq("Id", currentUser.id);

  if (error) {
    res.status(500).json({ error: "Failed to update profile photo" });
    return;
  }

  res.json({ ok: true, profileImage: imageUrl });
});

// ─── HTML helper ─────────────────────────────────────────────────────────────

function htmlPage(title: string, message: string, success: boolean): string {
  const color = success ? "#0F8A5F" : "#DC2626";
  const icon = success ? "✓" : "✗";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — Ughelli Vibes</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #f9fafb; display: flex; align-items: center;
           justify-content: center; min-height: 100vh; padding: 24px; }
    .card { background: #fff; border-radius: 16px; padding: 48px 40px;
            max-width: 480px; width: 100%; text-align: center;
            box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .icon { font-size: 56px; color: ${color}; margin-bottom: 16px; }
    h1 { font-size: 24px; color: #1a1a2e; margin-bottom: 12px; }
    p { font-size: 16px; color: #6b7280; line-height: 1.6; }
    .brand { margin-top: 32px; font-size: 14px; color: ${color}; font-weight: 600; letter-spacing: 0.5px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <div class="brand">UGHELLI VIBES</div>
  </div>
</body>
</html>`;
}

export default router;
