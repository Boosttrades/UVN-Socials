---
name: Ughelli Vibes product direction
description: Core product decisions, inspiration, and architecture for Ughelli Vibes TV mobile app
---

## Inspiration
X (Twitter) — interaction patterns: tap card → post detail, inline reply input at bottom, comment threads.

## Architecture
- Expo (mobile-first), web preview via Expo web build
- No backend in v1 — all data is mock in `constants/mockData.ts`
- No AsyncStorage yet — all state in `useState`
- pnpm monorepo: artifact at `artifacts/ughelli-vibes/`
- Navigation: expo-router file-based routing, `app/(tabs)/` for 5 tabs, `app/post/[id].tsx` for post detail, `app/settings.tsx` for settings

## Brand
- Primary: #0F8A5F (Deep Emerald Green), Secondary: #066A46
- Emergency: #DC2626, Warning: #F59E0B
- Fonts: Inter_400Regular / 500Medium / 600SemiBold / 700Bold

## Key patterns
- `useSafeAreaInsets()` for all top/bottom padding; web gets 67px top / 84px bottom tab fallback
- `Share` from react-native (built-in) for native share sheet — no expo-sharing needed
- `useRouter()` from expo-router for programmatic navigation

**Why:** Consistency across all screens is critical for feel; always match existing patterns before inventing new ones.
