# Ughelli Vibes TV

A local news network mobile app for Ughelli, Nigeria — inspired by X's interaction patterns. Tap cards for post detail, inline replies, comment threads, and a real-time emergency banner.

## Run & Operate

- **`Ughelli Vibes (web)`** workflow — Expo Metro dev server, web preview at port 8000
- **`API Server`** workflow — Express 5 API server at port 8080

- `pnpm install` — install all dependencies
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- Required env: `SESSION_SECRET` — session signing secret

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
  - `app/settings.tsx` — settings screen
  - `constants/mockData.ts` — all mock data (no backend in v1)
  - `constants/colors.ts` — brand color tokens
  - `components/` — shared components (FeedCard, EmergencyBanner, SearchBar, etc.)
- `artifacts/api-server/` — Express 5 API server
  - `src/routes/` — API route handlers
- `lib/` — shared library packages (api-spec, api-zod, api-client-react, db)

## Architecture decisions

- No backend in v1 — all data is mock in `constants/mockData.ts`
- No AsyncStorage yet — all state in `useState`
- `useSafeAreaInsets()` for all top/bottom padding; web gets 67px top / 84px bottom tab fallback
- `Share` from react-native (built-in) for native share sheet — no expo-sharing needed

## Product

Local news, sports, weather, and emergency alerts for Ughelli. Five tabs: Home feed, Discover, Create post, Activity/notifications, Profile.

## Brand

- Primary: `#0F8A5F` (Deep Emerald Green), Secondary: `#066A46`
- Emergency: `#DC2626`, Warning: `#F59E0B`
- Fonts: Inter_400Regular / 500Medium / 600SemiBold / 700Bold

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Native mobile preview (iOS/Android binary) requires opening the project on replit.com (desktop). The web preview works everywhere.
- `PORT` must be set explicitly when running the API server outside of an artifact-managed workflow.
- Expo dev command sets several env vars (`EXPO_PACKAGER_PROXY_URL`, `REPLIT_EXPO_DEV_DOMAIN`, etc.) — don't strip them.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `expo` skill for Expo-specific patterns
