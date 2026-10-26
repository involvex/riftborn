# Riftborn mobile (Expo shell)

Phaser stays the game. This app is a full-screen **WebView** that loads the Vite build with `?touch=1` so on-screen stick / ATK / E / DASH work inside Phaser.

## Dev (phone on same Wi‑Fi)

1. Root: `bun run dev` (Vite on `:5173`)
2. Print LAN URL: `bun run mobile:lan`
3. Root: `set EXPO_PUBLIC_GAME_URL=http://<lan-ip>:5173/?touch=1` then `bun run mobile:dev`  
   (or `cd mobile && bunx expo start` with that env var)

Scan the QR code with Expo Go. Landscape preferred; portrait still gets the touch pad.

## Prod-ish (built `dist/`)

```bash
bun run mobile:build
```

Builds the game, syncs `dist/` → `mobile/game-dist/`, starts `vite preview` on `:4173`, and opens Expo pointed at that preview URL. True App Store offline packaging is out of scope for this slice.

## Desktop

Keep using Electron (`bun run desktop`) — not this folder.
