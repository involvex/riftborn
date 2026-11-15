# Mobile performance (M7b — FOV-safe fillrate)

Playtest on Android (Expo WebView) historically showed ~32 fps in combat.
Jam stance: **best-effort**, FOV must not regress vs desktop.

## Measured / observed causes

| Source                             | Why it hurts on WebView                              |
| ---------------------------------- | ---------------------------------------------------- |
| Full `devicePixelRatio` canvas     | Phones often render 2–3× CSS pixels; fill-rate bound |
| Per-hit `add.text` + destroy       | GC spikes every swing / pack                         |
| Additive particle bursts every hit | Overdraw + blend cost                                |
| Hitstop + camera shake             | Extra frames stalled + redraw                        |
| High-res UI text (`resolution: 2`) | Extra glyph raster cost                              |

## What ships (Low / Auto on touch)

Setting: **Graphics** = Auto / Low / High (Settings + title).

- **Auto** → Low when `?touch=1` / coarse pointer / small screen; else High.
- **Low** (`src/core/GraphicsQuality.ts`):
  - Phaser **game size stays CSS/logical** (never buffer-sized — that
    overscaled or cropped the title UI)
  - Canvas matches game size (shrinking the drawing buffer below game size
    cropped the scene)
  - Camera zoom stays base (`getAppliedCameraZoom(1.1)` → `1.1`)
  - Fillrate wins come from juice budget: damage-number pool (8), particle
    cap (3), hitstop/shake ~40%, text resolution 1
  - Profile still exposes `renderScale: 0.65` for probes / future work
- **High**: full CSS pixels + juice budget

## Stick feel (touch)

- Analog magnitude honored in `Player.move` (vector length 0..1)
- Full speed at **0.42** deflection, accel ramp **60 ms** √ curve
- Camera follow lerp **0.28** on touch (was 0.38)

## How to verify

1. `/?touch=1` + Graphics Auto/Low → `__RIFTBORN.graphicsProfile()` shows
   `renderScale === 0.65` and `logicalWidth === bufferWidth` (game size
   stays CSS; juice caps apply).
2. Title screen buttons stay centered (not cropped / not overscaled).
3. Hub smoke M3d / P1 at 1024×473 still look wide (FOV).
4. `bun test src/core/GraphicsQuality.core.test.ts`
5. Stick: half push walks slower than full push.

## M3d contract

Do **not** shrink logical FOV without matching camera zoom. Unit guard:
`visibleWorldTileSpan(buffer, baseZoom×scale) ≈ visibleWorldTileSpan(css, baseZoom)`.
