import { randomBytes } from "crypto";
import { Router, type IRouter } from "express";
import { hash, verify as verifyPassword } from "@node-rs/argon2";
import { db, sessionsTable, usersTable } from "@workspace/db";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  updateProfileSchema,
} from "@workspace/db/schema";
import { and, eq, gt, or } from "drizzle-orm";
import { sendPasswordResetEmail, sendVerificationEmail } from "../lib/email";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// ─── helpers ────────────────────────────────────────────────────────────────

const ARGON2_OPTIONS = {
  algorithm: 2, // Argon2id
  memoryCost: 65536, // 64 MiB
  timeCost: 3,
  parallelism: 1,
};

/**
 * Pre-computed dummy hash used to make login response time constant
 * regardless of whether the email exists in the database.
 * Without this, an attacker can enumerate valid emails by measuring
 * how long the server takes to respond.
 */
let _dummyHash: string | null = null;
async function getDummyHash(): Promise<string> {
  if (!_dummyHash) {
    _dummyHash = await hash("__ughelli_vibes_timing_dummy__", ARGON2_OPTIONS);
  }
  return _dummyHash;
}

function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

function sessionExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 30); // 30-day sessions
  return d;
}

function verificationExpiresAt(): Date {
  const d = new Date();
  d.setHours(d.getHours() + 24); // 24-hour verification window
  return d;
}

function getAppBaseUrl(req: any): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers["host"];
  return `${proto}://${host}`;
}

/**
 * Base URL of the mobile app's web build (not the API server) — used for
 * links that must open an interactive in-app screen, like password reset.
 */
function getWebAppBaseUrl(): string {
  const domain = process.env.REPLIT_DEV_DOMAIN;
  if (domain) {
    return `https://${domain}`;
  }
  return "http://localhost:8000";
}

function computeResetTokenExpiresAt(): Date {
  const d = new Date();
  d.setHours(d.getHours() + 1); // 1-hour reset window
  return d;
}

const PROFILE_EDIT_COOLDOWN_DAYS = 14;

function msUntilNextProfileEdit(profileUpdatedAt: Date | null): number {
  if (!profileUpdatedAt) return 0;
  const nextAllowed = new Date(profileUpdatedAt);
  nextAllowed.setDate(nextAllowed.getDate() + PROFILE_EDIT_COOLDOWN_DAYS);
  return nextAllowed.getTime() - Date.now();
}

const WRONG_CREDENTIALS_MSG = "Wrong email/username or password";

// ─── POST /api/auth/signup ───────────────────────────────────────────────────

router.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const { name, username, email, password } = parsed.data;

  // Check uniqueness
  const [existingEmail] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  if (existingEmail) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  const [existingUsername] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.username, username.toLowerCase()))
    .limit(1);

  if (existingUsername) {
    res.status(409).json({ error: "Username is already taken" });
    return;
  }

  // Hash password with Argon2id
  const passwordHash = await hash(password, ARGON2_OPTIONS);

  // Generate email verification token
  const verificationToken = generateToken();
  const verificationTokenExpiresAt = verificationExpiresAt();

  // Create user
  const [user] = await db
    .insert(usersTable)
    .values({
      name,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      passwordHash,
      emailVerified: false,
      verificationToken,
      verificationTokenExpiresAt,
    })
    .returning({
      id: usersTable.id,
      name: usersTable.name,
      username: usersTable.username,
      email: usersTable.email,
    });

  // Send verification email
  const verificationUrl = `${getAppBaseUrl(req)}/api/auth/verify?token=${verificationToken}`;
  try {
    await sendVerificationEmail({ to: user.email, name: user.name, verificationUrl });
  } catch (err) {
    // Don't fail account creation over an email-delivery hiccup (e.g. Resend
    // test-mode restrictions before a sending domain is verified) — the
    // account still exists and can use "resend verification" later.
    req.log?.error?.({ err }, "Failed to send verification email");
  }

  res.status(201).json({
    message: "Account created! Check your email to verify your account.",
    user,
  });
});

// ─── POST /api/auth/login ────────────────────────────────────────────────────

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { identifier, password } = parsed.data;
  const normalizedIdentifier = identifier.trim().toLowerCase();

  const [user] = await db
    .select()
    .from(usersTable)
    .where(
      or(
        eq(usersTable.email, normalizedIdentifier),
        eq(usersTable.username, normalizedIdentifier)
      )
    )
    .limit(1);

  if (!user) {
    // Run a dummy hash verify so response time is constant whether or not
    // the account exists — prevents timing-based account enumeration.
    await verifyPassword(await getDummyHash(), password).catch(() => {});
    res.status(401).json({ error: WRONG_CREDENTIALS_MSG });
    return;
  }

  // Verify password with Argon2id
  const passwordMatches = await verifyPassword(user.passwordHash, password);
  if (!passwordMatches) {
    res.status(401).json({ error: WRONG_CREDENTIALS_MSG });
    return;
  }

  if (!user.emailVerified) {
    res.status(403).json({
      error: "Please verify your email before logging in.",
      code: "EMAIL_NOT_VERIFIED",
      email: user.email,
    });
    return;
  }

  // Create session
  const token = generateToken();
  await db.insert(sessionsTable).values({
    userId: user.id,
    token,
    expiresAt: sessionExpiresAt(),
  });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      emailVerified: user.emailVerified,
      profileUpdatedAt: user.profileUpdatedAt,
      createdAt: user.createdAt,
    },
  });
});

// ─── GET /api/auth/verify?token=... ─────────────────────────────────────────

router.get("/verify", async (req, res) => {
  const token = req.query["token"];

  if (!token || typeof token !== "string") {
    res.status(400).send(htmlPage("Invalid Link", "This verification link is invalid.", false));
    return;
  }

  const now = new Date();

  const [user] = await db
    .select()
    .from(usersTable)
    .where(
      and(
        eq(usersTable.verificationToken, token),
        gt(usersTable.verificationTokenExpiresAt, now)
      )
    )
    .limit(1);

  if (!user) {
    res.status(400).send(
      htmlPage(
        "Link Expired",
        "This verification link has expired or is invalid. Please sign up again.",
        false
      )
    );
    return;
  }

  // Mark as verified
  await db
    .update(usersTable)
    .set({
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiresAt: null,
    })
    .where(eq(usersTable.id, user.id));

  res.send(
    htmlPage(
      "Email Verified! ✓",
      `Welcome to Ughelli Vibes, ${user.name}! Your account is now active. Open the app and log in.`,
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

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase().trim()))
    .limit(1);

  // Always return success — don't reveal whether the email exists
  if (!user || user.emailVerified) {
    res.json({ message: "If that account exists and is unverified, a new link has been sent." });
    return;
  }

  // Issue a fresh token
  const verificationToken = generateToken();
  const verificationTokenExpiresAt = verificationExpiresAt();

  await db
    .update(usersTable)
    .set({ verificationToken, verificationTokenExpiresAt })
    .where(eq(usersTable.id, user.id));

  const verificationUrl = `${getAppBaseUrl(req)}/api/auth/verify?token=${verificationToken}`;
  try {
    await sendVerificationEmail({ to: user.email, name: user.name, verificationUrl });
  } catch (err) {
    req.log?.error?.({ err }, "Failed to send verification email");
  }

  res.json({ message: "If that account exists and is unverified, a new link has been sent." });
});

// ─── POST /api/auth/forgot-password ─────────────────────────────────────────

router.post("/forgot-password", async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A valid email is required" });
    return;
  }

  const { email } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  // Always return success — don't reveal whether the email exists
  const genericMessage = "If that account exists, a password reset link has been sent.";
  if (!user) {
    res.json({ message: genericMessage });
    return;
  }

  const resetToken = generateToken();
  const resetTokenExpiresAt = computeResetTokenExpiresAt();

  await db
    .update(usersTable)
    .set({ resetToken, resetTokenExpiresAt })
    .where(eq(usersTable.id, user.id));

  const resetUrl = `${getWebAppBaseUrl()}/auth/reset-password?token=${resetToken}`;
  try {
    await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });
  } catch (err) {
    // Don't leak email-delivery failures to the client — same reasoning as
    // not revealing whether the account exists. Log so it's visible to devs
    // (e.g. Resend test-mode restrictions before a sending domain is verified).
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
  const now = new Date();

  const [user] = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.resetToken, token), gt(usersTable.resetTokenExpiresAt, now)))
    .limit(1);

  if (!user) {
    res.status(400).json({ error: "This reset link has expired or is invalid. Please request a new one." });
    return;
  }

  const passwordHash = await hash(password, ARGON2_OPTIONS);

  await db
    .update(usersTable)
    .set({ passwordHash, resetToken: null, resetTokenExpiresAt: null })
    .where(eq(usersTable.id, user.id));

  // Invalidate all existing sessions so a stolen/old session can't survive a reset
  await db.delete(sessionsTable).where(eq(sessionsTable.userId, user.id));

  res.json({ message: "Your password has been reset. You can now log in." });
});

// ─── POST /api/auth/logout ───────────────────────────────────────────────────

router.post("/logout", requireAuth, async (req, res) => {
  const token = (req as any).sessionToken as string;
  await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
  res.json({ message: "Logged out" });
});

// ─── GET /api/auth/me ────────────────────────────────────────────────────────

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: (req as any).currentUser });
});

// ─── PATCH /api/auth/profile ─────────────────────────────────────────────────
// Change name and/or username. Requires the current password, and is rate
// limited to once every 14 days per account.

router.patch("/profile", requireAuth, async (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const currentUser = (req as any).currentUser;
  const { name, username, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, currentUser.id)).limit(1);
  if (!user) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const passwordMatches = await verifyPassword(user.passwordHash, password);
  if (!passwordMatches) {
    res.status(401).json({ error: "Incorrect password" });
    return;
  }

  const cooldownMs = msUntilNextProfileEdit(user.profileUpdatedAt);
  if (cooldownMs > 0) {
    const nextAllowedAt = new Date(Date.now() + cooldownMs);
    res.status(429).json({
      error: `You can change your name or username again on ${nextAllowedAt.toLocaleDateString()}.`,
      code: "PROFILE_EDIT_COOLDOWN",
      nextAllowedAt: nextAllowedAt.toISOString(),
    });
    return;
  }

  const normalizedUsername = username?.toLowerCase();

  if (normalizedUsername && normalizedUsername !== user.username) {
    const [existingUsername] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.username, normalizedUsername))
      .limit(1);

    if (existingUsername) {
      res.status(409).json({ error: "Username is already taken" });
      return;
    }
  }

  const nowIso = new Date();
  const [updated] = await db
    .update(usersTable)
    .set({
      ...(name !== undefined ? { name } : {}),
      ...(normalizedUsername !== undefined ? { username: normalizedUsername } : {}),
      profileUpdatedAt: nowIso,
    })
    .where(eq(usersTable.id, user.id))
    .returning({
      id: usersTable.id,
      name: usersTable.name,
      username: usersTable.username,
      email: usersTable.email,
      emailVerified: usersTable.emailVerified,
      profileUpdatedAt: usersTable.profileUpdatedAt,
      createdAt: usersTable.createdAt,
    });

  res.json({ message: "Profile updated", user: updated });
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
