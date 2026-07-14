# Ughelli Vibes TV

A local news network mobile app for Ughelli, Nigeria — inspired by X's interaction patterns. Tap cards for post detail, inline replies, comment threads, and a real-time emergency banner.

## Run & Operate

- **`artifacts/ughelli-vibes: expo`** workflow — Expo Metro dev server, web preview at port 8000
- **`artifacts/api-server: API Server`** workflow — Express 5 API server at port 8080

- `pnpm install` — install all dependencies
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push schema changes to the database
- Required secrets: `SESSION_SECRET` (session signing), `RESEND_API_KEY` (verification email) — both configured
- Object storage (App Storage) bucket is provisioned (`DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR` are set), but no upload routes/UI are wired yet — see follow-up tasks for photo uploads
- Known limitation: Resend is in test mode — it can only deliver to the account owner's own email until a sending domain is verified at resend.com/domains. Verification/reset email failures are caught and logged, not surfaced to the client, so signup/login still succeed in test mode.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo 54 + expo-router (file-based routing), React Native Web for web preview
- API: Express 5, Pino logger
- Fonts: Inter (400/500/600/700)
- Navigation: expo-router `app/(tabs)/` for 5 tabs, `app/post/[id].tsx` for post detail, `app/settings.tsx`

## Where things live

- `artifacts/ughelli-vibes/` — Expo mobile app
  - `app/(tabs)/` — 5 tabs: Home, Discover, Create, Activity, Profile
  - `app/post/[id].tsx` — post detail screen
  - `app/auth/` — login/signup screens
  - `app/settings.tsx` — settings screen
  - `contexts/AuthContext.tsx` — session state (token + user), backed by real `/api/auth` endpoints
  - `hooks/usePosts.ts` — TanStack Query hooks for the real `/api/posts` endpoints (feed + create)
  - `constants/mockData.ts` — only static UI config left (category colors, discover category tiles) + shared types; no fake posts/orgs/notifications
  - `constants/colors.ts` — brand color tokens
  - `components/` — shared components (FeedCard, EmergencyBanner, SearchBar, etc.)
- `artifacts/api-server/` — Express 5 API server
  - `src/routes/auth.ts` — signup/login/verify/logout/me/resend-verification/forgot-password/reset-password
  - `src/routes/posts.ts` — create/list/delete real posts
  - `src/middlewares/auth.ts` — `requireAuth` session middleware
- `lib/db/src/schema/` — Drizzle schema: `users`, `sessions`, `posts`
- `lib/` — shared library packages (api-spec, api-zod, api-client-react, db)
- `README.md` (in `artifacts/ughelli-vibes/`) — up-to-date snapshot of what's built vs. pending; update it at every checkpoint

## Architecture decisions

- Real backend: Postgres via Drizzle (`users`, `sessions`, `posts`), Express API, Argon2id password hashing, Resend for verification email
- Auth: Bearer session tokens in AsyncStorage (30-day expiry); `AuthContext` + `AuthGate` in `app/_layout.tsx` redirect based on session state
- Posts: `POST /api/posts` (auth required) creates, `GET /api/posts` lists newest-first (public read), `DELETE /api/posts/:id` (author-only). Feed/Discover/Profile all read through `hooks/usePosts.ts` (TanStack Query) — no more mock feed data
- Comments have no backend yet — replies on the post detail screen are session-local only (lost on reload)
- People search: `GET /api/users/search?q=` (name/username partial match) backs a Posts/People toggle in Discover; tapping a person opens `app/user/[username].tsx`, a public profile screen (stats, posts, Follow button) built on the existing `useUserProfile`/`useFollowUser` hooks
- Password reset: `app/auth/forgot-password.tsx` → email with link to `app/auth/reset-password.tsx?token=...` → `POST /api/auth/reset-password`. Reset tokens expire in 1 hour and resetting invalidates all existing sessions for that user.
- `useSafeAreaInsets()` for all top/bottom padding; web gets 67px top / 84px bottom tab fallback
- `Share` from react-native (built-in) for native share sheet — no expo-sharing needed

## Product

Local news, sports, weather, and emergency alerts for Ughelli. Five tabs: Home feed, Discover, Create post, Activity/notifications, Profile.

## Brand

- Primary: `#0F8A5F` (Deep Emerald Green), Secondary: `#066A46`
- Emergency: `#DC2626`, Warning: `#F59E0B`
- Fonts: Inter_400Regular / 500Medium / 600SemiBold / 700Bold

## User preferences

- Keep `artifacts/ughelli-vibes/README.md` up to date at every checkpoint — list all added/changed features there so collaborators know what's built and where to continue.

## Gotchas

- Native mobile preview (iOS/Android binary) requires opening the project on replit.com (desktop). The web preview works everywhere.
- `PORT` must be set explicitly when running the API server outside of an artifact-managed workflow.
- Expo dev command sets several env vars (`EXPO_PACKAGER_PROXY_URL`, `REPLIT_EXPO_DEV_DOMAIN`, etc.) — don't strip them.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `expo` skill for Expo-specific patterns
