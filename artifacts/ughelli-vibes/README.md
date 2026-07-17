# Ughelli Vibes TV — Build Status

A local news network app for Ughelli, Nigeria. This file is the handoff guide — **read this first** before touching anything.

Last updated: July 17, 2026 (rev 7)

---

## ⚠️ NOTHING IS STORED ON REPLIT

Every single piece of data — users, posts, images, sessions — lives in external services that you own. **This Replit account is just the host for the running code.** You can move to a new Replit account any time and zero data is lost.

| What | Where | Account |
|------|-------|---------|
| User accounts & passwords | Supabase Auth | Your Supabase project |
| Posts, comments, likes, bookmarks, follows, notifications | Supabase PostgreSQL | Your Supabase project |
| Profile photos & post images | Supabase Storage (`media` bucket) | Your Supabase project |
| Auth sessions (Bearer tokens) | Supabase Auth | Your Supabase project |

There is **no Replit Database**, **no Replit Object Storage**, **no Replit Postgres** in use. The Replit sidecar storage that was scaffolded originally has been completely removed from the codebase.

---

## Setting Up on a New Replit Account

1. Fork / import this repo into the new Replit account
2. Go to **Secrets** and add these 6 items (exact names matter):

| Secret name | Kind | Where to get it |
|-------------|------|-----------------|
| `SUPABASE_URL` | Secret | Supabase Dashboard → Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Secret | Supabase Dashboard → Project Settings → API → anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Supabase Dashboard → Project Settings → API → service_role key |
| `RESEND_API_KEY` | Secret | resend.com → API Keys |
| `SESSION_SECRET` | Secret | Any random 64-char hex string |
| `FROM_EMAIL` | **Env var** (not Secret) | The verified sender address in your Resend account |

3. Start the two workflows:
   - **API Server** (`artifacts/api-server: API Server`)
   - **Expo** (`artifacts/ughelli-vibes: expo`)
4. Done — all users, posts, and images are already there from Supabase. Nothing to migrate.

> `SUPABASE_DB_PASSWORD` is optional — only needed if you want to connect to the database directly via psql or TablePlus. The app itself never uses it.

---

## What's built

- **Login** — email **or** username (no `@` needed), show/hide password toggle
- **Signup** — email verification required (sent via Resend)
- **Forgot / reset password** — email link, 1-hour token, deletes old sessions
- **Edit profile** — name and username, password confirmation, 14-day cooldown
- **Profile photo** — tap avatar camera overlay → picks from library → uploads to Supabase Storage → permanent CDN URL stored in `Profiles.profile_image`
- **Share profile** — native OS share sheet with name and handle
- **Create post** — 6 post types (Update, Incident, Job, Event, Business, Traffic), optional photo upload, category tags
- **@mentions** — type `@` in the Details field → autocomplete chip strip → inserts `@username` → backend parses all mentions on publish and fires mention notifications to each tagged user
- **Post photo upload** — compress to 1080px, presigned PUT directly to Supabase Storage, permanent CDN URL stored on the post
- **Likes / bookmarks / shares** — real backend, per-user, optimistic UI updates
- **Comments** — threaded, newest-first, with optional `replyToHandle`
- **Follow / unfollow** — real `Follows` table, live counts on profiles
- **Feed** — paginated, newest-first, pull-to-refresh, category filter
- **Discover / search** — Posts tab searches headline + body + author name/username; People tab is server-side by name/username
- **Other users' profiles** — public screen with stats and posts, Follow button
- **Activity / notifications** — likes, comments, follows, mentions all create rows in Supabase `Notifications`. Tab badge shows unread count (polls every 30 s, re-fetches on app foreground). Filter tabs: All / Reactions / Follows / Mentions / System
- **Dark mode** — Light / Dark / System, persisted to AsyncStorage
- **Emergency banner** — shows only when a post has `isEmergency: true`

---

## What's not built yet

- **Resend domain verification** — Resend is in test mode; only the account owner's inbox receives verification and password-reset emails. To unlock delivery to all users: add a domain at resend.com/domains, verify the DNS records, then update `FROM_EMAIL` to an address on that domain.
- **Comment likes** — the like count on comments is UI-only, not persisted.
- **Web version** — mobile-only (Expo Go) for now.

---

## Key files

```
artifacts/api-server/src/
  routes/auth.ts          — login (email or username), signup, verify, reset password, profile patch
  routes/posts.ts         — feed, create post (with @mention notification dispatch), like, bookmark, share, comments
  routes/users.ts         — people search, public profile, follow/unfollow
  routes/storage.ts       — presigned upload URL (Supabase Storage), legacy object redirect
  routes/notifications.ts — list, mark read, mark all read
  lib/supabase.ts         — Supabase admin client (ws polyfill for Node 20)
  lib/notifications.ts    — fire-and-forget notification helper
  lib/email.ts            — Resend integration (verification + password reset)
  middlewares/auth.ts     — requireAuth / optionalAuth

artifacts/ughelli-vibes/
  contexts/AuthContext.tsx           — login/logout/session, updateProfileImage()
  contexts/NotificationsContext.tsx  — shared notifications state, 30 s poll, unread count
  contexts/ThemeContext.tsx          — appearance preference
  hooks/usePosts.ts                  — all feed/post/user/search hooks + TanStack Query cache
  app/(tabs)/create.tsx              — post creation with @mention autocomplete + photo upload
  app/(tabs)/profile.tsx             — profile screen, avatar upload, share sheet
  app/(tabs)/discover.tsx            — search (posts + people)
  app/(tabs)/activity.tsx            — notifications list (reads from NotificationsContext)
  app/(tabs)/_layout.tsx             — tab badge wired to unread notification count
  app/user/[username].tsx            — public profile screen
  app/post/[id].tsx                  — post detail with comments/likes/shares
  app/edit-profile.tsx               — name/username edit with 14-day cooldown
  app/auth/login.tsx                 — login screen (email or username, show/hide password)
  app/auth/signup.tsx                — signup with inline @handle
  app/auth/forgot-password.tsx       — request password reset email
  app/auth/reset-password.tsx        — set new password from reset link
```

---

## Known gotchas

- **`@node-rs/argon2` is a native binary** — it must stay in the `external` list in `artifacts/api-server/build.mjs`. Removing it breaks the build.
- **Resend test mode** — until a domain is verified, only the Supabase project owner's email receives messages. This affects signup verification and password reset for all other users.
- **Supabase `media` bucket** — created automatically on first server start. No manual setup needed in the Supabase dashboard.
- **Supabase PascalCase** — table and column names use PascalCase (`Profiles`, `Id`, `Post`, etc.). Match this exactly in any raw Supabase queries or you'll get "column does not exist" errors.
- **Node.js 20 WebSocket** — Node 20 has no native WebSocket. The Supabase client needs `ws` polyfilled on `globalThis.WebSocket` before `createClient()` is called. This is already done in `src/lib/supabase.ts`. Safe to remove if you upgrade to Node 22+.
- **`PORT` env var** — the API server workflow injects `PORT=8080` via `artifact.toml`. Without it the server throws on startup.
- **14-day profile-edit cooldown** — enforced both client-side (UX countdown) and server-side (`429 PROFILE_EDIT_COOLDOWN`). Client-side is just convenience; the API is the source of truth.
- **@mention autocomplete** — uses a trailing `/@(\w*)$/` regex on the body text as-you-type. Catches typing at the end of the field (the 95% case). Mid-text mentions don't show autocomplete but are still parsed server-side when the post is published.
- **After changing `lib/db` or `lib/api-zod`** — run `pnpm run typecheck:libs` from the repo root before typechecking `artifacts/api-server`, or tsc reports stale "Output file has not been built from source" errors.
