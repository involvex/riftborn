# Riftborn mobile (Expo shell)

Phaser is the game. Expo is a WebView shell.

## Commands (from repo root)

| Script                 | What it does                                                                 |
| ---------------------- | ---------------------------------------------------------------------------- |
| `bun run mobile:dev`   | Starts Vite if needed, writes LAN `.env`, installs **debug** APK             |
| `bun run mobile:build` | Builds Phaser → packs into APK assets → **release** APK (offline, no server) |

```bash
bun run mobile:dev     # iterate with hot Vite on Wi‑Fi
bun run mobile:build   # shareable APK, no laptop required
```

Release APK path (typical):

`mobile/android/app/build/outputs/apk/release/app-release.apk`

## Layout (touch)

Shared metrics in `src/ui/TouchLayout.ts`:

- **Left thumb:** move stick
- **Right thumb:** skill column + E + ATK + DASH
- **Top-left:** BAG / MAP / ☰ under HP
- **Top-right:** compact minimap only

## App icon

`bun run icons` then rebuild the app.
