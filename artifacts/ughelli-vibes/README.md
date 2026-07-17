# Ughelli Vibes TV — Build Status

A local news network app for Ughelli, Nigeria (X-inspired interaction patterns: tap a card for detail, inline replies, comment threads, emergency banner). This file is a snapshot for anyone picking up the build — **update it at every checkpoint** so it never goes stale.

Last updated: July 17, 2026 (rev 6)

## Required Secrets & Environment Variables

These must be re-entered on any Replit account or environment that runs this app. All user data lives in Supabase — switching accounts just requires adding these values again.

| Name | Kind | Where to find it | Required? |
|------|------|-----------------|-----------|
| `SUPABASE_URL` | Secret | Supabase Dashboard → Project Settings → API → Project URL | ✅ Yes |
| `SUPABASE_ANON_KEY` | Secret | Supabase Dashboard → Project Settings → API → anon public | ✅ Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Supabase Dashboard → Project Settings → API → service_role | ✅ Yes |
| `RESEND_API_KEY` | Secret | resend.com → API Keys | ✅ Yes |
| `SESSION_SECRET` | Secret | Any long random string (64+ hex chars) | ✅ Yes |
| `FROM_EMAIL` | Env var | Your verified Resend sender (e.g. `noreply@yourdomain.com`) | ✅ Yes |
| `SUPABASE_DB_PASSWORD` | Secret | Supabase Dashboard → Project Settings → Database | ⚪ Optional — only for direct Postgres access via psql/TablePlus |

> **Switching Replit accounts?** Import the repo from GitHub → add the 6 required items above → start the two workflows. Users and data stay in Supabase untouched.

## What's real right now

- **Accounts & login** — signup, login with **email or username** (no `@` needed), logout, email verification (via Resend), resend-verification flow. Argon2id password hashing, DB-backed sessions (30-day Bearer tokens). Login screen has a **show/hide password toggle** (👁️ icon). See `contexts/AuthContext.tsx` and `artifacts/api-server/src/routes/auth.ts`.
- **Forgot / reset password** — "Forgot password?" on the login screen → `app/auth/forgot-password.tsx` → email with reset link → `app/auth/reset-password.tsx?token=...`. Reset tokens expire in 1 hour; resetting deletes all existing sessions.
- **Username handles** — enforced unique by DB + signup API (`409 Username is already taken`); the signup form shows the `@` prefix inline.
- **Edit profile** — `app/edit-profile.tsx`. Change name and/or username with password confirmation. Limited to once every 14 days per account (countdown shown in UI; `429 PROFILE_EDIT_COOLDOWN` enforced server-side).
- **Profile photo** — tap the camera overlay on your avatar in the Profile tab to pick a photo. Uploads via presigned URL to object storage; stored as an object path in `Profiles.profile_image`; served through `GET /api/storage/objects/*`. Photo persists across sessions.
- **Profile — Share button** — the Share button on the Profile tab opens the native OS share sheet with your name and handle, so you can send it via WhatsApp, copy it, etc.
- **Settings screen** — shows real account info (name, `@username`, email). "Sign Out" calls `logout()`. "Change Password" routes to forgot-password.
- **Dark mode** — Appearance section in Settings (Light / Dark / System), backed by `contexts/ThemeContext.tsx`, persisted to AsyncStorage.
- **Posting** — the Create tab posts to `POST /api/posts`. Posts can have a headline, details body, optional photo, and a category. A failed request shows an inline error.
- **@mentions in posts** — type `@` anywhere in the Details field while creating a post and a horizontal chip strip appears showing matching users. Tap a chip to insert `@username` into the text. When the post is published, the backend parses all `@username` patterns and fires a **mention notification** to each mentioned user (no self-mentions, no duplicates). Users appear in the Activity tab under the Mentions filter.
- **Photo uploads on posts** — the Create screen's "Add a photo" picks an image, compresses it to 1080px/0.7q, uploads via presigned URL, then submits the URL as `imageUrl` on the post.
- **Comments** — real backend, newest first. `GET/POST /api/posts/:postId/comments` with optional `replyToHandle`. Comment authors get a notification.
- **Likes / bookmarks / shares** — real backend, toggleable per-user. Liking sends a notification to the post author. The feed returns live counts + `isLiked`/`isBookmarked` per caller. Optimistic cache updates via TanStack Query.
- **Follow / followers** — `POST /api/users/:username/follow` toggles a Follows row. Following someone sends them a notification. `GET /api/users/:username` returns real counts and `isFollowing`.
- **Feed ("For You")** — real posts from `GET /api/posts` via TanStack Query, newest first, pull-to-refresh, category filter.
- **Profile** — real name/handle/avatar/post-count/followers/following. Updates and Saved tabs backed by live data.
- **Discover / Search** — type anything in the search bar to search across **post headlines, body text, and author names/usernames** (Posts tab, client-side) or find people by name/username (People tab, server-side via `GET /api/users/search?q=`, case-insensitive partial match). Usernames are searchable — switch to the People tab. Tapping a person opens their public profile.
- **Other users' profiles** — `app/user/[username].tsx`: avatar, name, handle, stats, their posts, Follow/Unfollow button.
- **Activity / notifications** — real backend. Likes, comments, follows, and **@mentions** all create a Supabase `Notifications` row (fire-and-forget, no self-notifications). Activity tab shows 50 most-recent with actor name, time-ago, and unread dot. Filter tabs: All / Reactions / Follows / Mentions / System. Tapping marks read; "Mark all read" calls the batch endpoint. Unread count badge on the Activity tab icon updates every 30 s and on app foreground.
- **Home header buttons** — bell → Activity, search → Discover.
- **Emergency banner** — shown only when a real post has `isEmergency: true`.
- **All data in Supabase** — no Replit Postgres. Tables: `Profiles`, `Post`, `Comments`, `Likes`, `Bookmarks`, `Follows`, `Notifications`.

## What's intentionally not built yet

- **Comment likes** — the like count on comments is UI-only; not persisted.
- **Resend domain verification** — Resend is in test mode; only the account owner's inbox (`iboosttradesupport@gmail.com`) receives emails. Add a domain at resend.com/domains and update `FROM_EMAIL` to unlock delivery to all users.
- **Web version** — app is mobile-only (Expo Go); no web artifact yet.

## Current project tasks (see task list for live status)

- Push the database schema so posts, users, and sessions actually save — **proposed**
- Let users upload profile photos and post images — **done**
- Verify sending domain so all users can receive verification emails — **proposed**

## Key files if you're picking this up

- `artifacts/api-server/src/routes/{auth,posts,users,storage,notifications}.ts` — API routes
- `artifacts/api-server/src/lib/supabase.ts` — Supabase singleton (with `ws` WebSocket polyfill)
- `artifacts/api-server/src/lib/notifications.ts` — fire-and-forget notification helper
- `artifacts/api-server/src/middlewares/auth.ts` — `requireAuth` / `optionalAuth`
- `artifacts/ughelli-vibes/contexts/AuthContext.tsx` — login/logout/session state, `updateProfileImage()`
- `artifacts/ughelli-vibes/contexts/NotificationsContext.tsx` — shared notifications state, 30s poll, foreground re-fetch, unread count for tab badge
- `artifacts/ughelli-vibes/contexts/ThemeContext.tsx` — Appearance preference
- `artifacts/ughelli-vibes/hooks/usePosts.ts` — all feed/post/user/search hooks + TanStack Query cache
- `artifacts/ughelli-vibes/app/(tabs)/create.tsx` — post creation with @mention autocomplete + photo upload
- `artifacts/ughelli-vibes/app/(tabs)/profile.tsx` — profile screen, avatar upload, share sheet
- `artifacts/ughelli-vibes/app/(tabs)/discover.tsx` — search (posts + people)
- `artifacts/ughelli-vibes/app/user/[username].tsx` — public profile screen
- `artifacts/ughelli-vibes/app/post/[id].tsx` — post detail with comments/likes/shares
- `artifacts/ughelli-vibes/app/edit-profile.tsx` — name/username edit with cooldown
- `artifacts/ughelli-vibes/app/auth/login.tsx` — login (email or username, show/hide password)
- `artifacts/ughelli-vibes/app/auth/{forgot-password,reset-password}.tsx` — password reset

## Known gotchas

- `@node-rs/argon2` is a native binary — must stay in the esbuild `external` list in `artifacts/api-server/build.mjs`, or the API server build breaks.
- Resend test mode: only the account owner's inbox receives emails until a sending domain is verified.
- The API server dev workflow needs `PORT=8080` injected via `artifact.toml`.
- The 14-day profile-edit cooldown is enforced both client-side (UX) and server-side (source of truth).
- After changing anything in `lib/db` or `lib/api-zod`, run `pnpm run typecheck:libs` from the repo root before typechecking `artifacts/api-server`.
- The mobile client is Expo/React Native — use `expo-image-picker` + direct `fetch` PUT for uploads, not `@workspace/object-storage-web` (Uppy/React-DOM, incompatible with RN).
- Supabase table/column names use PascalCase (`Profiles`, `Id`, `Post`, etc.) — match exactly or you'll get "column does not exist" errors.
- Node.js 20 lacks native WebSocket — the Supabase client needs `ws` polyfilled on `globalThis.WebSocket` before `createClient()` (already done in `src/lib/supabase.ts`). Upgrade to Node 22+ to remove this polyfill.
- @mention detection in the create screen uses a trailing `/@(\w*)$/` regex on the body text — it catches typing at the end of the field, which is the 95% case. Mentions at mid-text positions won't trigger the autocomplete (the final parsed usernames in the post are still extracted server-side regardless).
