---
name: Auth implementation
description: How auth (signup/login/session/email-verify) is built in Ughelli Vibes
---

## Architecture

- **Password hashing**: `@node-rs/argon2` (Argon2id, m=65536, t=3, p=1). Must be in esbuild externals in `build.mjs`.
- **Sessions**: server-side rows in `sessions` DB table; 64-char hex token sent to client as Bearer token.
- **Client storage**: AsyncStorage key `@ughelli_vibes/session_token`; restored on app mount via `/api/auth/me`.
- **Email verification**: token stored in `users.verification_token`, expires 24h. Link logged to console in dev — no email provider yet.
- **Timing safety**: login runs a dummy Argon2 verify when user not found, cached at first use (`_dummyHash`).

## Key files

- `lib/db/src/schema/users.ts` — `usersTable`, `signupSchema`, `loginSchema`, `PublicUser` type
- `lib/db/src/schema/sessions.ts` — `sessionsTable`
- `artifacts/api-server/src/routes/auth.ts` — 5 endpoints: signup, login, verify (GET, HTML response), logout, me
- `artifacts/api-server/src/middlewares/auth.ts` — `requireAuth` middleware (Bearer token → DB lookup)
- `artifacts/api-server/src/lib/email.ts` — console-log stub; swap for real provider here
- `artifacts/ughelli-vibes/contexts/AuthContext.tsx` — `AuthProvider`, `useAuth()` hook
- `artifacts/ughelli-vibes/utils/api.ts` — `apiRequest()`, `ApiError`, `getApiBase()`
- `artifacts/ughelli-vibes/app/auth/` — login, signup, verify-email screens + `_layout.tsx`
- `artifacts/ughelli-vibes/app/_layout.tsx` — wraps with `AuthProvider`; gates `(tabs)` behind auth

## Auth gate pattern

`RootLayoutNav` calls `useAuth()`. While `isLoading`, renders nothing (session restore). When `user` is null → shows `auth` stack (login first). When `user` is set → shows `(tabs)` stack.

**Why:** Expo Router renders the first matched screen; by conditionally registering screens, unauthenticated users can never navigate to `(tabs)` regardless of deep links.

## Session expiry

- Sessions: 30 days
- Verification tokens: 24 hours

## API base URL (Expo)

`https://${EXPO_PUBLIC_DOMAIN}/api` when `EXPO_PUBLIC_DOMAIN` is set (Replit dev); falls back to `http://localhost:8080/api`.
