/**
 * UPDATE CONFIGURATION
 * ---------------------
 * This is the ONLY place you need to change when moving the update.json file.
 *
 * Point UPDATE_JSON_URL at your public GitHub-hosted update.json file.
 * Use the raw.githubusercontent.com URL (not the GitHub web UI URL).
 *
 * Example:
 *   https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/update.json
 *
 * Expected update.json format:
 * {
 *   "versionCode": 2,
 *   "versionName": "1.1.0",
 *   "apkUrl": "https://github.com/you/repo/releases/download/v1.1.0/app-release.apk",
 *   "mandatory": true,
 *   "releaseNotes": "What changed in this version"
 * }
 *
 * Rules:
 * - Bump versionCode by 1 for every new APK build (integer, not semver).
 * - versionCode is the ONLY field that triggers an update. Changing apkUrl alone does nothing.
 * - Set mandatory: true to force the update before the user can use the app.
 * - Set mandatory: false to let the user choose to update later.
 */
export const UPDATE_JSON_URL =
  'https://raw.githubusercontent.com/YOUR_GITHUB_USERNAME/YOUR_REPO/main/update.json';
