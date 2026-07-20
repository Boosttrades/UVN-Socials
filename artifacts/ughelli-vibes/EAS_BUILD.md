# EAS Build — Ughelli Vibes TV

Builds are done in the EAS cloud (Expo's build service). You run one command from
your machine or Replit shell; EAS compiles the app and gives you a download link.

---

## One-time setup

```bash
# 1. Install the EAS CLI globally
npm install -g eas-cli

# 2. Log in to your Expo account (create one free at expo.dev if needed)
eas login

# 3. Link this project to your Expo account (run from artifacts/ughelli-vibes/)
cd artifacts/ughelli-vibes
eas init
```

`eas init` adds an `extra.eas.projectId` to `app.json` automatically — commit that
change so future builds stay linked to the same project.

---

## Set your API URL

Before building, edit `eas.json` and replace the placeholder in **both** `preview`
and `production` profiles:

```
"EXPO_PUBLIC_API_URL": "https://REPLACE_WITH_YOUR_DEPLOYED_API_URL/api"
```

This is the URL of the deployed API Server (the one on port 8080). Deploy it first
on Replit (Deployments tab), then paste that URL here.

Alternatively, store it as an EAS secret so it never touches the repo:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_API_URL \
  --value "https://your-api.replit.app/api"
```

Then remove the `env` block from `eas.json` — EAS injects secrets automatically.

---

## Build profiles

| Profile | Output | Use for |
|---|---|---|
| `development` | Debug APK | Testing with Expo Dev Client (hot reload on device) |
| `preview` | Release APK | Sideloading / internal testing |
| `production` | AAB (App Bundle) | Google Play Store submission |

---

## Build commands

Run these from `artifacts/ughelli-vibes/`:

```bash
# Sideloadable APK for internal testing
eas build --platform android --profile preview

# Production AAB for the Play Store
eas build --platform android --profile production

# Debug APK with Expo Dev Client (if you want hot reload on a real device)
eas build --platform android --profile development
```

EAS prints a build URL when it starts. When it finishes (~5–15 min), download the
APK/AAB from that URL or from expo.dev → your project → Builds.

---

## Bump the version before each release

In `app.json`, increment both values:

```json
"version": "1.0.1",          ← shown in Play Store / app info
"android": {
  "versionCode": 2,           ← must increase every Play Store upload
```

`appVersionSource: "local"` in `eas.json` means EAS reads these from `app.json`
directly, so just edit and build — no extra command needed.

---

## Submit to the Play Store (after first manual upload)

1. Upload the first AAB manually via the Play Console to create the app listing.
2. Create a Google Service Account and download `google-service-account.json`.
3. Place `google-service-account.json` in `artifacts/ughelli-vibes/` (gitignored).
4. Run:

```bash
eas submit --platform android --profile production
```

This uploads the latest production build directly to the Play Store internal track.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `eas: command not found` | `npm install -g eas-cli` |
| `Project not linked` | Run `eas init` inside `artifacts/ughelli-vibes/` |
| App hits wrong API | Check `EXPO_PUBLIC_API_URL` in `eas.json` or EAS secrets |
| `versionCode` already used | Increment `android.versionCode` in `app.json` |
| Build fails on Supabase | Supabase keys are in `SUPABASE_*` env — set them as EAS secrets |
