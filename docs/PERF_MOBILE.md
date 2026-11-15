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
  - `renderScale: 0.65` — canvas/game resize to **buffer** size
  - CSS stretch back to viewport (`pixelated`)
  - Camera zoom via `getAppliedCameraZoom(1.1)` = `1.1 × 0.65` so tile span matches High
  - Damage-number pool + hard cap (8 live)
  - Particle burst cap (3)
  - Scale hitstop / shake (~40%)
  - Text resolution 1 for floating numbers
- **High**: full CSS pixels + juice budget

## Stick feel (touch)

- Analog magnitude honored in `Player.move` (vector length 0..1)
- Full speed at **0.42** deflection, accel ramp **60 ms** √ curve
- Camera follow lerp **0.28** on touch (was 0.38)

## How to verify

1. `/?touch=1` + Graphics Auto/Low → `__RIFTBORN.graphicsProfile()` shows
   `bufferWidth < logicalWidth` and `renderScale === 0.65`.
2. Hub smoke M3d / P1 at 1024×473 still look wide (FOV).
3. `bun test src/core/GraphicsQuality.core.test.ts`
4. Stick: half push walks slower than full push.

## M3d contract

Do **not** shrink logical FOV without matching camera zoom. Unit guard:
`visibleWorldTileSpan(buffer, baseZoom×scale) ≈ visibleWorldTileSpan(css, baseZoom)`.
