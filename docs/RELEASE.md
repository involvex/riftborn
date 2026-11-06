# Releases

## Creating a release

You can create a release in two ways:

### Option 1: Push a git tag

```bash
git tag v0.1.0
git push origin v0.1.0
```

### Option 2: Manual workflow dispatch

1. Go to Actions → Release → Run workflow
2. Enter the tag name (e.g. `v0.1.0`)

## Artifacts

Each release includes:

- **Windows portable**: `Riftborn-<version>-portable.exe` (built via `bun run build:portable`)
- **Android APK**: `Riftborn-<version>.apk` (built via `bun run mobile:build` with CI-safe Android build)

## Android signing (optional)

The Android build uses debug signing by default, so no secrets are required for the first release build. If you want to sign with your own keystore, add the following GitHub Secrets:

- `KEYSTORE_BASE64` - Base64-encoded keystore file
- `KEYSTORE_PASSWORD` - Keystore password
- `KEY_ALIAS` - Key alias
- `KEY_PASSWORD` - Key password

**Never commit keystores or passwords to the repository.**

## Local builds

- Windows portable: `bun run build:portable`
- Android APK (release): `bun run mobile:build`
