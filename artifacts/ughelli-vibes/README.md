# Ughelli Vibes TV — Build Status

A local news network app for Ughelli, Nigeria (X-inspired interaction patterns: tap a card for detail, inline replies, comment threads, emergency banner). This file is a snapshot for anyone picking up the build — **update it at every checkpoint** so it never goes stale.

Last updated: July 13, 2026

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
- **Discover** — category grid is still a fixed navigation list (not fake data), but "Trending topics" and "Verified organizations" were removed since there's no real data to back them. Search now filters real posts by headline.
- **Emergency banner** — shown only when a real post has `isEmergency: true`, links to that post.

## What's intentionally not built yet

- **Comment likes** — the like count next to each comment is still UI-only; it doesn't persist or affect anything server-side.
- **A dedicated "other user" profile screen** — you can follow a post's author from the post detail screen, but there's no route yet for browsing a stranger's profile page (posts, full follower list, etc.) — only your own Profile tab exists.
- **Multi-user social graph at scale** — the API and schema are generic (any authenticated user can post, like, bookmark, follow, or share; feed shows everyone's posts), so it works correctly with many accounts, but there's no notifications/activity feed tie-in yet for "so-and-so followed you" or "so-and-so liked your post".

## Current project tasks (see task list for live status)

- Publish a web version of Ughelli Vibes people can open in a browser
- Connect the app to a real backend so posts and comments persist — **done**
- Let users create accounts and log in — **done**
- Let users attach a photo when creating a post — **done**
- Make post likes, shares, and bookmarks actually save — **done**
- Let users follow each other and see real follower counts — **done**

## Key files if you're picking this up

- `lib/db/src/schema/{users,sessions,posts,comments,postLikes,postBookmarks,follows}.ts` — Drizzle schema (`posts` now also has `imageUrl`/`sharesCount`; `post_likes`/`post_bookmarks`/`follows` are unique-pair join tables)
- `artifacts/api-server/src/routes/{auth,posts,users,storage}.ts` — API routes (comment/like/bookmark/share routes live in `posts.ts`; follow + public profile in `users.ts`; object storage upload/serve in `storage.ts`)
- `artifacts/api-server/src/middlewares/auth.ts` — `requireAuth` (blocks) and `optionalAuth` (attaches user if present, never blocks — used by the public feed/profile endpoints to include per-user like/bookmark/follow state)
- `artifacts/api-server/src/lib/{objectStorage,objectAcl}.ts` — object storage service (standard skill templates, unmodified)
- `artifacts/api-server/src/lib/email.ts` — Resend integration (verification + password reset emails)
- `artifacts/ughelli-vibes/contexts/AuthContext.tsx` — client session state, includes `updateProfile()`
- `artifacts/ughelli-vibes/contexts/ThemeContext.tsx` — Appearance preference (light/dark/system), persisted to AsyncStorage
- `artifacts/ughelli-vibes/hooks/usePosts.ts` — feed/post/comment/like/bookmark/share/follow fetch + mutations (with optimistic cache updates), plus the mapping from API shapes to the UI's `FeedPost`/`Comment` shapes
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
