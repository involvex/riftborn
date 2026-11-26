# Native Expo game path

Use when gameplay is **not** a WebView-hosted canvas (or the user asks for a
native Expo game). Riftborn’s primary path is WebView; this file is the alternate.

## Scaffold checklist

1. Read `expo` major in `package.json` → versioned docs.
2. Routes: Expo Router (`src/app/`); keep non-route code outside route folders.
3. Add native libs with `bunx expo install` / `npx expo install` only.
4. After any native module: **development build**
   (`expo run:android` or EAS development profile) — Expo Go is insufficient.
5. CNG: do not hand-maintain `android/` / `ios/`; use `app.json` + config plugins.
6. Orientation, immersive mode, keep-awake: Expo modules first.
7. Verify on browser/web target only if the game actually runs there; otherwise
   state that native-only APIs need a device/emulator build (user runs ADB).

## Input and frame budget

- Prefer Gesture Handler + Reanimated for sticks and buttons.
- Avoid doing heavy sim work every RN render; fixed timestep in a dedicated loop.
- Audio: Expo AV / preferred module from current SDK docs.
- Haptics: Expo Haptics for light feedback on hits/UI.

## Shipping

- Cloud: `bunx eas-cli build --platform android` / `submit`.
- OTA: `eas update` for JS-only fixes (not native binary changes).
- Local Gradle: only when the project already documents `android/` + signing.

## Vs WebView shell

| Concern | Native Expo | WebView shell |
|---------|-------------|----------------|
| Hot reload of game | Metro / Expo | Vite HMR into WebView or browser |
| Pixel games / Phaser | Awkward | Natural fit |
| Store IAP / push | Straightforward | Native shell + bridge |
| Touch HUD | RN components | Game canvas HUD (`?touch=1`) |

If unsure, fingerprint the repo: `react-native-webview` loading `EXPO_PUBLIC_GAME_URL`
or `android_asset/www` → stay on WebView shell.
