---
name: expo-android-games
description: >
  Ships and iterates Android games through Expo: detect WebView-shell vs native Expo
  gameplay, run Vite/dev with phone-scale browser preview (?touch=1), build APKs, and
  respect CNG/EAS. Use when the user mentions Expo, Android, mobile game, APK, WebView
  shell, touch HUD, or mobile:dev / mobile:build. Not for raw ADB device control
  (user runs install/launch) or Phaser scene/API work alone (phaser-core).
---

# Expo Android games

Get an HTML5 or Expo game playable on Android with a short loop: detect the shell,
preview on a phone-sized browser first, then build the APK when the user wants a
device install. Prefer docs over training data for Expo APIs.

## When to use

- Mobile shell work under `mobile/`, Expo config, WebView bridge, touch layout,
  LAN/debug vs offline release APK.
- User says Expo, Android, APK, touch controls, `mobile:dev`, `mobile:build`, or
  “test on phone”.
- Pair with `phaser-core` / `game-ui-ux` for canvas game or HUD changes; this
  skill owns the Android delivery path.

**Not this skill:** inventing a second map/game engine; running `adb install` /
`adb shell am start` / monkey on the user’s physical device; Expo API answers
from memory without checking the pinned SDK.

## Hard preferences (this repo / this user)

1. **Agent runs the game server and verifies in the browser** at a **mobile
   viewport** (landscape phone), with touch UI forced (`?touch=1`).
2. **User runs ADB** on their physical device (`install`, launch, monkey). Agent
   may **build** the APK and print its path; do not install or interrupt the
   device unless they explicitly ask in that turn.
3. **Emulator** is optional / later — do not require it for day-to-day work.
4. **Expo docs freshness:** read `expo` major in `mobile/package.json`, then
   `https://docs.expo.dev/versions/v<major>.0.0/` or
   `https://docs.expo.dev/llms.txt`. Never trust memorized Expo APIs.

## Workflow

1. **Detect the shell** (table below). Riftborn is **WebView shell**.
2. **Iterate in browser (default verify):**
   - `bun run dev` (root) if Vite is not up.
   - Open `http://localhost:5173/?touch=1` (or `/?smoke=1&touch=1` for hub smoke).
   - Set a **landscape phone** viewport (e.g. 854×480 or 915×412). See
     [references/browser-mobile-preview.md](references/browser-mobile-preview.md).
   - Check touch HUD (stick / ATK / E / skills) and safe-area layout.
3. **Only when asked for device/APK:** use the shell’s build commands; hand the
   APK path to the user for install.
4. **Native modules / CNG:** configure `app.json` + config plugins; do not hand-
   edit generated `android/` when Continuous Native Generation is in play.
5. **Done bar:** for game code, still run root `typecheck` / `lint` /
   `format:check` / `build` per `AGENTS.md`. After map/POI changes, `test:smoke`.

## Detect shell

| Signal                                                                        | Shell                                                                                              | Meaning                                                             |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `mobile/` + `react-native-webview` loading Vite/`file://` game                | **WebView shell**                                                                                  | Phaser (or other canvas) is the game; Expo is a thin native wrapper |
| Gameplay in RN/Expo views, Skia, Reanimated, Gesture Handler, no game WebView | **Native Expo**                                                                                    | Logic and draw live in the Expo app                                 |
| Both present                                                                  | Prefer WebView for canvas jam games; keep native for menus/IAP/push only if already split that way |

### WebView shell (Riftborn default)

| Path                                         | Role                                                     |
| -------------------------------------------- | -------------------------------------------------------- |
| `src/` + Vite                                | Real game (Phaser)                                       |
| `mobile/App.tsx`                             | Full-screen WebView, landscape lock, Android back → game |
| `?touch=1` / coarse pointer / small viewport | On-screen controls (`TouchControls`, `TouchLayout`)      |
| `bun run mobile:dev`                         | LAN Vite URL into `mobile/.env` + debug Android run      |
| `bun run mobile:build`                       | `build` → sync `www` assets → **release** APK (offline)  |
| `bun run mobile:lan`                         | Only write LAN `.env`                                    |
| `bun run mobile:sync`                        | Copy `dist` into Android assets                          |

Dev game URL pattern: `http://<lan-ip>:5173/?touch=1`.  
Release Android URI: `file:///android_asset/www/index.html` when
`EXPO_PUBLIC_GAME_BUNDLE=1`.

Typical release APK:

`mobile/android/app/build/outputs/apk/release/app-release.apk`

If `mobile/android` is missing locally: once,
`cd mobile && bunx expo prebuild --platform android` (user/CI), then build again.

**Bridge rules:** keep game↔native messages small and versioned (e.g. back
policy via `injectJavaScript` + `onMessage`). Prefer feature flags in the URL
(`touch`, `smoke`) over forking the bundle.

### Native Expo game path

Use when the repo has no canvas WebView (or the user asks for RN-native
gameplay):

1. Expo Router screens under the app’s `src/app/` (or project convention).
2. `npx expo install <pkg>` / `bunx expo install` — never raw add for native
   modules (SDK-aligned versions).
3. Gestures: `react-native-gesture-handler` + Reanimated; draw: Skia or GL when
   needed. Keep the game loop off the JS thread when frame budget is tight.
4. Dev: `bunx expo start` / `expo run:android`. After native deps: **dev
   client**, not Expo Go alone.
5. Store builds: EAS (`bunx eas-cli`); local release only when the project
   already documents it.

Details and checklist:
[references/native-expo-path.md](references/native-expo-path.md).

## Commands cheat sheet (Riftborn)

```bash
# Preferred agent loop
bun run dev
# Browser: http://localhost:5173/?touch=1  (mobile landscape viewport)

# Device iteration (user installs/launches; agent may start the script if asked)
bun run mobile:dev

# Shareable offline APK
bun run mobile:build
```

Always `expo install` for Expo-related packages inside `mobile/`.

## Gotchas

- **Desktop HUD on phone preview** → missing `?touch=1` and viewport still wide
  (auto-touch also needs coarse pointer or ≤900px max edge).
- **Blank WebView on device** → Vite not on LAN, wrong IP in `.env`, or cleartext
  HTTP blocked; debug uses LAN HTTP by design.
- **Release still hits LAN** → `EXPO_PUBLIC_GAME_BUNDLE` not set / assets not
  synced (`mobile:sync`).
- **Edited `android/` by hand** → next prebuild wipes it; use app config +
  plugins.
- **Agent ran `adb install`** → violates user preference; build only, report path.

## Verify

| Goal         | Check                                                                      |
| ------------ | -------------------------------------------------------------------------- |
| Touch layout | Browser `/?touch=1` at landscape phone size; stick + actions visible       |
| Hub / POIs   | `/?smoke=1&touch=1` + `__RIFTBORN` / `bun run test:smoke` when map-related |
| APK exists   | `mobile:build` → print APK path; user installs                             |
| Expo health  | `cd mobile && bunx expo-doctor` when deps look wrong                       |
