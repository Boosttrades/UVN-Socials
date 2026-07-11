# Ughelli Vibes TV — Build Status

A local news network app for Ughelli, Nigeria (X-inspired interaction patterns: tap a card for detail, inline replies, comment threads, emergency banner). This file is a snapshot for anyone picking up the build — **update it at every checkpoint** so it never goes stale.

Last updated: July 11, 2026

## What's real right now

- **Accounts & login** — signup, login, logout, email verification (via Resend), resend-verification flow. Argon2id password hashing, DB-backed sessions (30-day Bearer tokens). See `contexts/AuthContext.tsx` and `artifacts/api-server/src/routes/auth.ts`.
- **Forgot / reset password** — "Forgot password?" on the login screen → `app/auth/forgot-password.tsx` (enter email) → email with a link to `app/auth/reset-password.tsx?token=...` → set + confirm a new password. Backend: `POST /api/auth/forgot-password` and `POST /api/auth/reset-password` in `artifacts/api-server/src/routes/auth.ts`. Reset tokens expire in 1 hour; resetting a password deletes all of that user's existing sessions. Email delivery is subject to the same Resend test-mode limitation as signup verification (see Known gotchas).
- **Username handles** — usernames are enforced unique by the database and the signup API (`409 Username is already taken`); the signup form now shows the `@` prefix inline (`app/auth/signup.tsx`) to match how handles are displayed everywhere else (profile, post detail, comments).
- **Posting** — the Create tab posts to a real `POST /api/posts` endpoint. No more "fake success" — a failed request shows a real inline error.
- **Comments** — real backend. The post detail screen reads/writes through `GET/POST /api/posts/:postId/comments` (`hooks/usePosts.ts`: `useComments`, `useCreateComment`), backed by a `comments` table (`lib/db/src/schema/comments.ts`) with `postId`/`authorId` foreign keys and an optional `replyToHandle`. Replies persist across reloads; newest first.
- **Feed ("For You")** — reads real posts from `GET /api/posts` via `hooks/usePosts.ts` (TanStack Query), newest first, filterable by category, pull-to-refresh re-fetches.
- **Profile** — shows the logged-in user's real name/handle/initials and their real posts + a real post count. No mock stats beyond followers/following (which have no backend yet, so they read 0).
- **Discover** — category grid is still a fixed navigation list (not fake data), but "Trending topics" and "Verified organizations" were removed since there's no real data to back them. Search now filters real posts by headline.
- **Emergency banner** — shown only when a real post has `isEmergency: true`, links to that post.

## What's intentionally not built yet

- **Comment likes** — the like count next to each comment is still UI-only; it doesn't persist or affect anything server-side.
- **Likes / shares / bookmarks (on posts)** — UI exists and is interactive, but counts are not persisted to the server; they reset on reload.
- **Follow / followers** — UI exists (Follow buttons, follower counts) but not wired to anything; counts always show 0.
- **Photo uploads on posts** — the Create screen shows an "Add photo — coming in next release" placeholder; no image upload endpoint exists.
- **Multi-user social graph** — since only one user account exists today, the feed is effectively that user's own posts. The API is written generically (any authenticated user can post; feed shows everyone's posts) so it will scale once more accounts exist.

## Current project tasks (see task list for live status)

- Publish a web version of Ughelli Vibes people can open in a browser
- Connect the app to a real backend so posts and comments persist — **done**
- Let users create accounts and log in — **done**

## Key files if you're picking this up

- `lib/db/src/schema/{users,sessions,posts,comments}.ts` — Drizzle schema (`users` now also has `resetToken`/`resetTokenExpiresAt`)
- `artifacts/api-server/src/routes/{auth,posts}.ts` — API routes (comment routes live in `posts.ts`, nested under `/posts/:postId/comments`)
- `artifacts/api-server/src/middlewares/auth.ts` — `requireAuth` middleware
- `artifacts/api-server/src/lib/email.ts` — Resend integration (verification + password reset emails)
- `artifacts/ughelli-vibes/contexts/AuthContext.tsx` — client session state
- `artifacts/ughelli-vibes/hooks/usePosts.ts` — feed/post/comment fetch + mutations, plus the mapping from API shapes to the UI's `FeedPost`/`Comment` shapes
- `artifacts/ughelli-vibes/app/post/[id].tsx` — post detail screen, reads/writes comments through the API instead of local state
- `artifacts/ughelli-vibes/app/_layout.tsx` — `AuthGate` redirect logic (segments + router.replace pattern)
- `artifacts/ughelli-vibes/app/auth/{forgot-password,reset-password}.tsx` — password reset screens

## Known gotchas

- `@node-rs/argon2` is a native binary — it must stay in the esbuild `external` list in `artifacts/api-server/build.mjs` (along with `*.node`), or the API server build breaks.
- Resend is in test mode: it can only deliver to the account owner's own inbox until a sending domain is verified at resend.com/domains and `FROM_EMAIL` is updated to that domain.
- The API server's dev workflow needs `PORT=8080` injected via `artifact.toml` — without it the dev command doesn't bind a port.
