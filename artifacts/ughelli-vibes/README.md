# Ughelli Vibes TV — Build Status

A local news network app for Ughelli, Nigeria (X-inspired interaction patterns: tap a card for detail, inline replies, comment threads, emergency banner). This file is a snapshot for anyone picking up the build — **update it at every checkpoint** so it never goes stale.

Last updated: July 11, 2026

## What's real right now

- **Accounts & login** — signup, login, logout, email verification (via Resend), resend-verification flow. Argon2id password hashing, DB-backed sessions (30-day Bearer tokens). See `contexts/AuthContext.tsx` and `artifacts/api-server/src/routes/auth.ts`.
- **Posting** — the Create tab posts to a real `POST /api/posts` endpoint. No more "fake success" — a failed request shows a real inline error.
- **Feed ("For You")** — reads real posts from `GET /api/posts` via `hooks/usePosts.ts` (TanStack Query), newest first, filterable by category, pull-to-refresh re-fetches.
- **Profile** — shows the logged-in user's real name/handle/initials and their real posts + a real post count. No mock stats beyond followers/following (which have no backend yet, so they read 0).
- **Discover** — category grid is still a fixed navigation list (not fake data), but "Trending topics" and "Verified organizations" were removed since there's no real data to back them. Search now filters real posts by headline.
- **Emergency banner** — shown only when a real post has `isEmergency: true`, links to that post.

## What's intentionally not built yet

- **Comments** — no backend. Replies on the post detail screen are session-local (kept in React state only, lost on reload). No `comments` table exists.
- **Likes / shares / bookmarks** — UI exists and is interactive, but counts are not persisted to the server; they reset on reload.
- **Follow / followers** — UI exists (Follow buttons, follower counts) but not wired to anything; counts always show 0.
- **Photo uploads on posts** — the Create screen shows an "Add photo — coming in next release" placeholder; no image upload endpoint exists.
- **Multi-user social graph** — since only one user account exists today, the feed is effectively that user's own posts. The API is written generically (any authenticated user can post; feed shows everyone's posts) so it will scale once more accounts exist.

## Current project tasks (see task list for live status)

- Publish a web version of Ughelli Vibes people can open in a browser
- Connect the app to a real backend so posts and comments persist — **partially done**: posts persist; comments still do not
- Let users create accounts and log in — **done**

## Key files if you're picking this up

- `lib/db/src/schema/{users,sessions,posts}.ts` — Drizzle schema
- `artifacts/api-server/src/routes/{auth,posts}.ts` — API routes
- `artifacts/api-server/src/middlewares/auth.ts` — `requireAuth` middleware
- `artifacts/ughelli-vibes/contexts/AuthContext.tsx` — client session state
- `artifacts/ughelli-vibes/hooks/usePosts.ts` — feed fetch + create-post mutation, plus the mapping from API post shape to the UI's `FeedPost` shape
- `artifacts/ughelli-vibes/app/_layout.tsx` — `AuthGate` redirect logic (segments + router.replace pattern)

## Known gotchas

- `@node-rs/argon2` is a native binary — it must stay in the esbuild `external` list in `artifacts/api-server/build.mjs` (along with `*.node`), or the API server build breaks.
- Resend is in test mode: it can only deliver to the account owner's own inbox until a sending domain is verified at resend.com/domains and `FROM_EMAIL` is updated to that domain.
- The API server's dev workflow needs `PORT=8080` injected via `artifact.toml` — without it the dev command doesn't bind a port.
