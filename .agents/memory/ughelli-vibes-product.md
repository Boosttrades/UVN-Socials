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

## Setup / re-import notes
- After a fresh GitHub import, artifact.toml files can exist on disk with no workflows registered (`listArtifacts()` returns empty, `.replit` `[workflows]` empty). Reading/exploring the artifact dirs triggers re-registration; workflows then appear automatically without calling `createArtifact` again.
- Signup's and resend-verification's `sendVerificationEmail` calls were unguarded and threw 500s under Resend test-mode restrictions; wrapped in try/catch (log-only) to match the forgot-password pattern — signup/login must succeed even when email delivery fails.
- Object storage on this Expo (React Native) client cannot use `@workspace/object-storage-web` (Uppy/React-DOM only) — implemented uploads manually: `expo-image-picker` picks the image, then a direct `fetch(uploadURL, {method:'PUT'})` sends the blob to the presigned URL returned by the server's `/storage/uploads/request-url`. Server-side object storage templates (objectStorage.ts/objectAcl.ts) are framework-agnostic and used unmodified.
- Testing signup/login locally requires bypassing Resend's test-mode email restriction: `UPDATE users SET email_verified = true WHERE email = '...'` via `psql "$DATABASE_URL"` after signup, since verification emails can only deliver to the account owner's inbox.
- Monorepo TS project references: after editing anything under `lib/db` or `lib/api-zod`, run `pnpm run typecheck:libs` (`tsc --build` at repo root) before typechecking any artifact — otherwise tsc reports stale "Output file has not been built from source" errors unrelated to the actual change.

## Key patterns
- `useSafeAreaInsets()` for all top/bottom padding; web gets 67px top / 84px bottom tab fallback
- `Share` from react-native (built-in) for native share sheet — no expo-sharing needed
- `useRouter()` from expo-router for programmatic navigation

**Why:** Consistency across all screens is critical for feel; always match existing patterns before inventing new ones.
