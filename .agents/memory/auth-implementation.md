---
name: Auth implementation
description: How auth (signup/login/session/email-verify) is built in Ughelli Vibes
---

## Architecture

- **Password hashing**: `@node-rs/argon2` (Argon2id, m=65536, t=3, p=1). Must be in esbuild externals in `build.mjs`.
- **Sessions**: server-side rows in `sessions` DB table; 64-char hex token sent to client as Bearer token.
- **Client storage**: AsyncStorage key `@ughelli_vibes/session_token`; restored on app mount via `/api/auth/me`.
- **Email verification**: token stored in `users.verification_token`, expires 24h. Sent via Resend.
- **Timing safety**: login runs a dummy Argon2 verify when user not found, cached at first use (`_dummyHash`).

## Email (Resend)

- Package: `resend` installed in `@workspace/api-server`
- Template: branded HTML + plain-text fallback in `src/lib/email.ts`
- Env vars: `RESEND_API_KEY` (secret), `FROM_EMAIL` (env var, default `onboarding@resend.dev`)
- To use a custom domain sender later: verify domain in Resend dashboard, then update `FROM_EMAIL`

## Key files

- `lib/db/src/schema/users.ts` — `usersTable`, `signupSchema`, `loginSchema`, `PublicUser` type
- `lib/db/src/schema/sessions.ts` — `sessionsTable`
- `artifacts/api-server/src/routes/auth.ts` — 5 endpoints: signup, login, verify (GET, HTML), logout, me
- `artifacts/api-server/src/middlewares/auth.ts` — `requireAuth` middleware (Bearer token → DB lookup)
- `artifacts/api-server/src/lib/email.ts` — Resend integration; swap `FROM_EMAIL` env var for custom sender
- `artifacts/ughelli-vibes/contexts/AuthContext.tsx` — `AuthProvider`, `useAuth()` hook
- `artifacts/ughelli-vibes/utils/api.ts` — `apiRequest()`, `ApiError`, `getApiBase()`
- `artifacts/ughelli-vibes/app/auth/` — login, signup, verify-email screens + `_layout.tsx`
- `artifacts/ughelli-vibes/app/_layout.tsx` — `AuthGate` (useSegments+useRouter) inside `AuthProvider`

## Auth gate pattern

`AuthGate` component (inside `_layout.tsx`) calls `useAuth()` + `useSegments()`. On auth state change, redirects with `router.replace()`. While `isLoading`, does nothing (session restore). Stack always renders all screens; routing is controlled by redirects, not conditional screen registration.

**Why:** Expo Router's file-system routing doesn't work reliably with conditionally registered screens. The `useSegments + useRouter.replace` pattern is the canonical Expo Router auth gate.

## Session expiry

- Sessions: 30 days
- Verification tokens: 24 hours
- Password reset tokens: 1 hour; resetting a password deletes all of that user's sessions

## Password reset

- `POST /api/auth/forgot-password` (email) → generates `resetToken`/`resetTokenExpiresAt` on `usersTable`, emails a link to the **web app's own domain** (`REPLIT_DEV_DOMAIN`, not the API server's), e.g. `/auth/reset-password?token=...`
- `POST /api/auth/reset-password` (token, password) → validates token+expiry, rehashes, clears token, deletes all sessions for that user
- Both forgot/reset screens live in `app/auth/` like other auth screens (`Stack` auto-registers them, no layout changes needed)
- Email-send failures in `forgot-password` are caught and logged, never surfaced to the client — same email-enumeration-safety reasoning as not revealing whether the account exists. Signup's verification email send is NOT wrapped this way (pre-existing gap) — worth matching this pattern there too if touched again.

## API base URL (Expo)

`https://${EXPO_PUBLIC_DOMAIN}/api` when `EXPO_PUBLIC_DOMAIN` is set (Replit dev); falls back to `http://localhost:8080/api`.
