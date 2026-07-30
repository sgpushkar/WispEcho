# WispEcho Release Guide

Step-by-step checklist for publishing a new WispEcho version.

---

## Pre-release Checklist

### 1. Update Version Numbers

Update all four locations — they must match:

| File | Field | Example |
|------|-------|---------|
| `backend/version-config.json` | `latestVersion`, `versionCode` | `"1.2.0"`, `3` |
| `frontend/hooks/useUpdateChecker.ts` | `CURRENT_VERSION` | `"1.2.0"` |
| `frontend/android/app/build.gradle` | `versionCode`, `versionName` | `3`, `"1.2.0"` |
| `frontend/package.json` | `version` | `"1.2.0"` |

### 2. Update Changelog

Add a new entry to **both** files:

- `backend/version-config.json` → add to the `changelog` array (newest first)
- `CHANGELOG.md` → add a new section at the top

### 3. Set Minimum Version (if needed)

If old app versions are incompatible with the current backend:

```json
// backend/version-config.json
{
  "minimumVersion": "1.2.0"
}
```

> ⚠️ This blocks ALL users below this version from using the app until they update.

### 4. Update Download URL (if using GitHub Releases)

```json
// backend/version-config.json
{
  "downloadUrl": "https://github.com/<user>/genz-chat/releases/download/v1.2.0/WispEcho-v1.2.0.apk"
}
```

---

## Release Steps

### Option A: Automated (GitHub Actions)

```bash
# 1. Commit all version changes
git add -A
git commit -m "release: v1.2.0"

# 2. Tag the release
git tag v1.2.0

# 3. Push to trigger the workflow
git push origin main --tags
```

GitHub Actions will:
- Build the frontend
- Sync to Capacitor
- Build the Android APK
- Create a GitHub Release with the APK attached

After the workflow completes, update `downloadUrl` in `version-config.json` to point
to the GitHub Release asset URL and push that change.

### Option B: Manual

```bash
# 1. Build the frontend
cd frontend
npm run build

# 2. Sync Capacitor
npx cap sync android

# 3. Build APK (requires Android Studio / SDK)
cd android
./gradlew assembleDebug  # or assembleRelease with signing

# 4. Rename APK
cp app/build/outputs/apk/debug/app-debug.apk WispEcho-v1.2.0.apk

# 5. Upload to GitHub Releases manually
# 6. Update downloadUrl in version-config.json
# 7. Deploy backend
```

---

## Post-release Verification

- [ ] Open `https://your-api.com/version.json` and verify the response
- [ ] Open WispEcho on a device with the old version → update dialog should appear
- [ ] Download page shows new changelog
- [ ] APK download link works
- [ ] APK installs correctly on Android

---

## Version Number Rules

```
Major.Minor.Patch
  │     │     └── Bug fixes (1.0.1)
  │     └──────── New features (1.1.0)
  └────────────── Breaking changes / redesign (2.0.0)
```

- **Always increment `versionCode`** — Android requires this
- **Never reuse a version tag** — each release gets a unique `v*.*.*`
- **Never name APKs like** `app_final_v2_latest.apk` — use `WispEcho-v1.2.0.apk`
