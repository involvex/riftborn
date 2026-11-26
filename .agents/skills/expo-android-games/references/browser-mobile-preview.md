# Browser mobile preview

Default verify path for Expo Android game work: **no device required**.

## URL

| Mode | URL |
|------|-----|
| Touch HUD | `http://localhost:5173/?touch=1` |
| Hub smoke + touch | `http://localhost:5173/?smoke=1&touch=1` |
| Force desktop HUD | `http://localhost:5173/?touch=0` |

Riftborn also enables touch when `window.__RIFTBORN_TOUCH` is set, or when
`(pointer: coarse)` matches, or `max(innerWidth, innerHeight) <= 900`.

Prefer an explicit `?touch=1` so desktop DevTools emulation is unambiguous.

## Viewport

Lock **landscape** (matches `expo-screen-orientation` on device).

| Preset | CSS pixels (W×H) | Notes |
|--------|------------------|--------|
| Compact landscape | 854×480 | Fast layout stress |
| Pixel-ish landscape | 915×412 | Common phone |
| Tall phone rotated | 844×390 | iPhone-class |

In Cursor browser / CDP:

1. Start or reuse tab → navigate to the touch URL.
2. `Emulation.setDeviceMetricsOverride` with width/height above, `deviceScaleFactor: 2` or `3`, `mobile: true`.
3. Snapshot or screenshot; confirm touch chrome (left stick, right ATK/E/skills).
4. Clear override when finished (`Emulation.clearDeviceMetricsOverride`) if the session continues on desktop sizes.

Chrome DevTools: Toggle device toolbar → landscape → same sizes → refresh with `?touch=1`.

## What to look for

- Stick and action cluster not clipped by notches (safe area).
- Ability bar readable; minimap/chrome tray usable.
- No desktop-only prompts as the only affordance (e.g. “Press M”) without a touch path.
- Performance: pan/zoom and particle spam still usable at phone width.

## When browser is not enough

- WebView-only bugs (file:// assets, back button bridge, splash).
- Then: build APK (`bun run mobile:build` or `mobile:dev`), give the user the
  path; they install. Emulator is optional later.
