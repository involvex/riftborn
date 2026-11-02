# Mobile performance (M1)

Playtest on Android (Expo WebView) showed ~32 fps in combat / inventory.
Root causes and the Low-quality profile that Auto enables on touch devices.

## Measured / observed causes

| Source                             | Why it hurts on WebView                              |
| ---------------------------------- | ---------------------------------------------------- |
| Full `devicePixelRatio` canvas     | Phones often render 2–3× CSS pixels; fill-rate bound |
| Per-hit `add.text` + destroy       | GC spikes every swing / pack                         |
| Additive particle bursts every hit | Overdraw + blend cost                                |
| Hitstop + camera shake             | Extra frames stalled + redraw                        |
| High-res UI text (`resolution: 2`) | Extra glyph raster cost                              |

## Fixes (graphics quality profile)

Setting: **Graphics** = Auto / Low / High (Settings + title).

- **Auto** → Low when `?touch=1` / coarse pointer / small screen; else High.
- **Low** (`src/core/GraphicsQuality.ts`):
  - Render buffer ~65% of CSS size, stretched via canvas CSS (`Phaser.Scale.NONE`)
  - Damage-number pool + hard cap (10 live)
  - Skip routine hit/burn particles; cap concurrent bursts
  - Scale hitstop / shake (~45%)
  - Text resolution 1 for floating numbers
- **High**: native scale, prior juice budget

## How to verify

1. `/?touch=1` → FPS HUD should stay closer to 50–60 in a pack.
2. Settings → Graphics → High restores desktop look (heavier).
3. `bun test src` covers tier resolve / caps.

## M1g check (2026-11-02) — Auto/Low on touch vs ~32 fps

Playwright phone viewport `1024×473` + `/?smoke=1&touch=1` with
`graphicsQuality: 'auto'`:

| Probe (`window.__RIFTBORN.graphicsProfile()`) | Result                           |
| --------------------------------------------- | -------------------------------- |
| `setting`                                     | `auto`                           |
| `tier`                                        | `low` (Auto → touch → Low works) |
| `renderScale` / `getAppliedRenderScale()`     | `0.65` recorded                  |
| `particleCap`                                 | `4` (Low juice path active)      |

**Verdict:** The Low _tier_ does apply on touch (particles / dmg-number
cap / juiceScale). There is **no obvious “Auto ignored” bug**.

Remaining fill-rate gap: `applyGraphicsProfile` still resizes the Phaser
logical size to the full CSS viewport and only _records_ `renderScale`.
The canvas backing store is **not** downscaled to 65% anymore (disabled
earlier because shrinking `scale.resize` zoomed the world FOV). That
matches continued ~32 fps reports on Android WebView even with Auto/Low —
juice caps help, but pixel fill stays near native DPR.

**No code fix in M1g** — restoring buffer downscale needs a FOV-safe path
(separate from logical game size), not a one-liner.
