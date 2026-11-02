# Mobile / Touch Audit (M2a)

Landscape phone target: **1024×473** and **1280×720** with `/?touch=1`.
Every keyboard hotkey must have a reachable touch path; overlays must stay
in-viewport with ≥44px interactive hits.

## Hotkeys → Touch

| Aktion            | Default key | Touch-Weg                                | Status |
| ----------------- | ----------- | ---------------------------------------- | ------ |
| Move              | WASD        | Virtual stick (left pad)                 | ok     |
| Attack            | LMB         | ATK pad                                  | ok     |
| Gather / interact | E           | E pad (context label: Loot/Talk/Rift/…)  | ok     |
| Craft / bench     | F           | E near Bram / Forge (label Craft)        | ok     |
| Character         | C           | Chrome CHAR (☰ / minimap tray)          | ok     |
| Inventory         | I           | Chrome BAG                               | ok     |
| Skill tree        | K           | Chrome SKILL                             | ok     |
| Ability 1/2/3     | 1/2/3       | Right skill column (AbilityBar)          | ok     |
| Rift portal       | R           | E near Obelisk / Exit (label Rift/Exit)  | ok     |
| Return to town    | B           | Town ⌂ left of minimap (rift/wilderness) | ok     |
| Dash              | Space       | DASH pad                                 | ok     |
| Co-op             | P           | Pause menu → Co-op                       | ok     |
| Pause / settings  | Esc         | Chrome ☰ → Pause; Settings inside       | ok     |
| Equip tool        | T           | Inventory: double-tap tool stack         | ok     |
| Map               | M           | Chrome MAP / minimap tap opens overlay   | ok     |
| World shift       | Q           | SHIFT pad (above DASH)                   | ok     |

## Screens / overlays

| Screen               | Touch-Weg                                      | Status |
| -------------------- | ---------------------------------------------- | ------ |
| Title (BootScene)    | Tap Play / Create / slot                       | ok     |
| Character create     | Tap class / gender / Start (DOM name on touch) | ok     |
| Hub HUD              | Stick + pads + chrome                          | ok     |
| Rift HUD             | Same + town ⌂; RiftHud top                     | ok     |
| Inventory            | BAG / openInventory; ✕ + scrim                 | ok     |
| Character            | CHAR; close text / Esc                         | ok     |
| Skills               | SKILL; ✕ + scrim                               | ok     |
| Map overlay          | MAP; ✕ + scrim                                 | ok     |
| Shop (Mira)          | E near vendor; ✕ + scrim                       | ok     |
| Trader (Nix)         | E near trader; ✕ + scrim                       | ok     |
| Craft                | E near Bram/Forge; ✕ + scrim                   | ok     |
| Pause / Settings     | ☰; Resume / Settings / Co-op / Title          | ok     |
| Hotkeys (settings)   | Two-column list on touch                       | ok     |
| Death / rift summary | Continue / Return to hub (≥44px)               | ok     |

## Notes

- Chrome tray collapses by default; tap minimap or ☰ to expand BAG/CHAR/SKILL/MAP.
- `craft` / `portal` / `gather` share the context E button (M1g); dedicated F/R keys are desktop shortcuts to the same nearby actions.
- Mapping source of truth: `src/core/HotkeyTouchMap.ts` (+ unit test).
- Playwright: `e2e/m2a.touch.spec.ts` → `artifacts/m2a-<screen>-<WxH>.png`.
- Pad hits (stick / DASH / SHIFT / ATK / E / skills / chrome / town) enforced ≥44px via `computeTouchLayout` unit tests + Playwright `touchHits()`.

## Final status (M2a)

All rows above are **ok**. No unbegrüdete `fehlt` entries remain.
Co-op was the only keyboard action without a prior pad/chrome path; it is now
Pause → Co-op (`ui:toggleCoop`). Hotkeys settings use a two-column layout on
touch so the rebind list fits 1024×473.
