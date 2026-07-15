# Ughelli Vibes TV — Build Status

A local news network app for Ughelli, Nigeria (X-inspired interaction patterns: tap a card for detail, inline replies, comment threads, emergency banner). This file is a snapshot for anyone picking up the build — **update it at every checkpoint** so it never goes stale.

Last updated: July 15, 2026 (rev 3)

## What's real right now

- **Accounts & login** — signup, login, logout, email verification (via Resend), resend-verification flow. Argon2id password hashing, DB-backed sessions (30-day Bearer tokens). See `contexts/AuthContext.tsx` and `artifacts/api-server/src/routes/auth.ts`.
- **Forgot / reset password** — "Forgot password?" on the login screen → `app/auth/forgot-password.tsx` (enter email) → email with a link to `app/auth/reset-password.tsx?token=...` → set + confirm a new password. Backend: `POST /api/auth/forgot-password` and `POST /api/auth/reset-password` in `artifacts/api-server/src/routes/auth.ts`. Reset tokens expire in 1 hour; resetting a password deletes all of that user's existing sessions. Email delivery is subject to the same Resend test-mode limitation as signup verification (see Known gotchas).
- **Username handles** — usernames are enforced unique by the database and the signup API (`409 Username is already taken`); the signup form now shows the `@` prefix inline (`app/auth/signup.tsx`) to match how handles are displayed everywhere else (profile, post detail, comments).
- **Edit profile** — `app/edit-profile.tsx`, reachable from the Settings profile card, the "Edit Profile" row, and the Profile tab's button. Change name and/or username; requires re-entering the current password (`PATCH /api/auth/profile`, verified with Argon2). Limited to once every 14 days per account — the screen shows a countdown and disables the form while in cooldown, and the API enforces the same window server-side (`429 PROFILE_EDIT_COOLDOWN`) regardless of client state.
- **Settings screen shows the real account** — the profile card now reads the logged-in user's real name, `@username`, and email from `AuthContext` (previously showed a hardcoded fake person). "Sign Out" actually calls `logout()`. "Change Password" routes to the forgot-password flow.
- **Dark mode** — a real Appearance section in Settings (Light / Dark / System), backed by `contexts/ThemeContext.tsx` (persisted to AsyncStorage) and a `dark` palette in `constants/colors.ts`. `hooks/useColors.ts` now resolves the active palette from this preference instead of the raw OS setting, so it survives app restarts and doesn't require following the device setting.
- **Brand accent pass** — Emerald Green (`primary`) is now used more deliberately across the app: profile avatar background, profile stat numbers, the section-header accent tick in Settings, and a 2px primary underline on the main screen headers (For You, Activity, Settings, Edit Profile) — replacing the previous flat neutral border.
- **Posting** — the Create tab posts to a real `POST /api/posts` endpoint. No more "fake success" — a failed request shows a real inline error. Posts can optionally include a photo (see below).
- **Photo uploads on posts** — the Create screen's "Add a photo" picks an image (`expo-image-picker`), uploads it directly to object storage via a presigned URL (`POST /api/storage/uploads/request-url`), then submits the returned URL as `imageUrl` on the post. Images are served back through `GET /api/storage/objects/*` (public — post images are always public feed content, no ACL check). See `lib/objectStorage.ts`/`lib/objectAcl.ts` (standard object-storage-skill templates, unmodified) and `routes/storage.ts` in the API server.
- **Comments** — real backend. The post detail screen reads/writes through `GET/POST /api/posts/:postId/comments` (`hooks/usePosts.ts`: `useComments`, `useCreateComment`), backed by a `comments` table (`lib/db/src/schema/comments.ts`) with `postId`/`authorId` foreign keys and an optional `replyToHandle`. Replies persist across reloads; newest first.
- **Likes / bookmarks / shares (on posts)** — real backend, toggleable per-user. Liking/bookmarking hits `POST /api/posts/:id/like` / `.../bookmark` (`post_likes`/`post_bookmarks` tables, one row per user per post); sharing hits `POST /api/posts/:id/share` and increments a `sharesCount` counter column on the post (no per-user toggle — matches the native share-sheet UX). The feed (`GET /api/posts`) returns each post's live `likesCount`/`commentsCount`/`sharesCount` plus, for the logged-in caller, `isLiked`/`isBookmarked`. `hooks/usePosts.ts` (`useLikePost`, `useBookmarkPost`, `useSharePost`) applies optimistic updates against the shared TanStack Query cache so `FeedCard` and the post detail screen stay in sync. The Profile screen's "Saved" tab now lists the caller's real bookmarked posts.
- **Follow / followers** — real backend. `POST /api/users/:username/follow` toggles a row in the `follows` table (unique per follower/following pair, self-follow blocked); `GET /api/users/:username` returns real `followersCount`/`followingCount`/`postsCount`/`isFollowing`. The Profile screen's stat row and the post detail screen's Follow/Following button (hidden on your own posts) both read this live.
- **Feed ("For You")** — reads real posts from `GET /api/posts` via `hooks/usePosts.ts` (TanStack Query), newest first, filterable by category, pull-to-refresh re-fetches.
- **Profile** — shows the logged-in user's real name/handle/initials, real post count, real followers/following counts, and (Saved tab) real bookmarked posts.
- **Discover** — category grid is still a fixed navigation list (not fake data), but "Trending topics" and "Verified organizations" were removed since there's no real data to back them. Search has a Posts / People toggle: Posts still filters real posts by headline client-side; People hits a real server-side search (`GET /api/users/search?q=`, name/username partial match, case-insensitive) and lists matching accounts with Follow/Following state.
- **Other users' profiles** — tapping a person in People search opens `app/user/[username].tsx`, a public profile screen (avatar, name, handle, follower/following/post stats, their real posts, Follow/Following button). Reuses the same `useUserProfile`/`useFollowUser` hooks the post-detail screen already used.
- **Home header buttons** — the bell (notifications) and search icons in the Home tab header now navigate to Activity and Discover respectively; previously they were unwired and did nothing on tap.
- **Emergency banner** — shown only when a real post has `isEmergency: true`, links to that post.
- **Supabase connection** — `@supabase/supabase-js` installed in the API server; singleton client in `artifacts/api-server/src/lib/supabase.ts` using `SUPABASE_URL` / `SUPABASE_ANON_KEY` (Replit Secrets). Connects to an existing Supabase project (Profiles, Posts, Comments, Likes tables + storage buckets + Supabase Auth) without touching its schema. Verified live: `GET /api/supabase/ping` → `{ ok: true, latencyMs: 568 }`.

## What's intentionally not built yet

- **Comment likes** — the like count next to each comment is still UI-only; it doesn't persist or affect anything server-side.
- **Notifications / activity feed** — the bell icon opens the Activity tab, but that tab's list is still session-local mock data; there's no backend for "so-and-so followed you / liked your post" events yet.
- **Supabase data integration** — the Supabase client is connected and verified, but the app's data layer (posts, comments, auth) still runs through the Express API + Replit Postgres. The Supabase tables are not yet used for reads or writes.

## Current project tasks (see task list for live status)

- Publish a web version of Ughelli Vibes people can open in a browser
- Connect the app to a real backend so posts and comments persist — **done**
- Let users create accounts and log in — **done**
- Let users attach a photo when creating a post — **done**
- Make post likes, shares, and bookmarks actually save — **done**
- Let users follow each other and see real follower counts — **done**
- Let users search for people, not just posts — **done**
- Connect to Supabase — **done**

## Key files if you're picking this up

- `lib/db/src/schema/{users,sessions,posts,comments,postLikes,postBookmarks,follows}.ts` — Drizzle schema (`posts` now also has `imageUrl`/`sharesCount`; `post_likes`/`post_bookmarks`/`follows` are unique-pair join tables)
- `artifacts/api-server/src/routes/{auth,posts,users,storage,supabase}.ts` — API routes (comment/like/bookmark/share routes live in `posts.ts`; follow + public profile + people search in `users.ts`; object storage in `storage.ts`; Supabase connectivity test in `supabase.ts`)
- `artifacts/api-server/src/lib/supabase.ts` — Supabase singleton client (anon key, `ws` WebSocket polyfill for Node 20)
- `artifacts/api-server/src/middlewares/auth.ts` — `requireAuth` (blocks) and `optionalAuth` (attaches user if present, never blocks — used by the public feed/profile endpoints to include per-user like/bookmark/follow state)
- `artifacts/api-server/src/lib/{objectStorage,objectAcl}.ts` — object storage service (standard skill templates, unmodified)
- `artifacts/api-server/src/lib/email.ts` — Resend integration (verification + password reset emails)
- `artifacts/ughelli-vibes/contexts/AuthContext.tsx` — client session state, includes `updateProfile()`
- `artifacts/ughelli-vibes/contexts/ThemeContext.tsx` — Appearance preference (light/dark/system), persisted to AsyncStorage
- `artifacts/ughelli-vibes/hooks/usePosts.ts` — feed/post/comment/like/bookmark/share/follow/people-search fetch + mutations (with optimistic cache updates), plus the mapping from API shapes to the UI's `FeedPost`/`Comment` shapes
- `artifacts/ughelli-vibes/app/user/[username].tsx` — public profile screen for any user (opened from People search results)
- `artifacts/ughelli-vibes/app/post/[id].tsx` — post detail screen, reads/writes comments + likes/bookmarks/shares/follow through the API instead of local state
- `artifacts/ughelli-vibes/app/(tabs)/create.tsx` — photo picker + presigned-URL upload flow before publishing a post
- `artifacts/ughelli-vibes/app/edit-profile.tsx` — edit name/username with password confirmation + 14-day cooldown UI
- `artifacts/ughelli-vibes/app/_layout.tsx` — `AuthGate` redirect logic (segments + router.replace pattern), wraps the tree in `ThemeProvider`
- `artifacts/ughelli-vibes/app/auth/{forgot-password,reset-password}.tsx` — password reset screens

## Known gotchas

- `@node-rs/argon2` is a native binary — it must stay in the esbuild `external` list in `artifacts/api-server/build.mjs` (along with `*.node`), or the API server build breaks.
- Resend is in test mode: it can only deliver to the account owner's own inbox until a sending domain is verified at resend.com/domains and `FROM_EMAIL` is updated to that domain.
- The API server's dev workflow needs `PORT=8080` injected via `artifact.toml` — without it the dev command doesn't bind a port.
- The 14-day profile-edit cooldown is enforced both client-side (for UX — countdown + disabled form) and server-side (source of truth — `PATCH /auth/profile` returns `429 PROFILE_EDIT_COOLDOWN` if bypassed).
- After changing anything in `lib/db` or `lib/api-zod`, run `pnpm run typecheck:libs` (`tsc --build`) from the repo root before typechecking `artifacts/api-server` — otherwise `tsc` reports stale "Output file has not been built from source" errors even though the source is correct.
- The mobile client is Expo/React Native, not a web app — object storage uploads use `expo-image-picker` + a direct `fetch` PUT to the presigned URL, not the `@workspace/object-storage-web` package (that package is Uppy/React-DOM-based and does not work in React Native).
- Supabase table/column names in this project use PascalCase (`Profiles`, `Id`, etc.) — match this exactly in any Supabase queries or you'll get "column does not exist" errors.
- Node.js 20 lacks native WebSocket — the Supabase client needs `ws` polyfilled on `globalThis.WebSocket` before `createClient()` is called (already done in `src/lib/supabase.ts`). If you upgrade Node to 22+ this polyfill can be removed.
