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

## M2b — readability & pad feedback (1024×473)

| Issue                                               | Fix                                                                        | Status |
| --------------------------------------------------- | -------------------------------------------------------------------------- | ------ |
| Tiny HUD/overlay copy (slot labels, Layer, fps, D#) | `uiFontPx(role, profile)` with touch floor 12 CSS-px                       | ok     |
| Skill labels clipped (`STRIK`)                      | `shortTouchSkillLabel` whole words + fit check                             | ok     |
| Bag grid under-uses width / cells &lt;44            | `computeInventoryLayout` touch cells ≥44, fill bag width                   | ok     |
| No visible skill cooldown                           | Radial sweep overlay on AbilityBar pads                                    | ok     |
| Weak pad press feel                                 | Scale+brighten on press; optional `navigator.vibrate` (Settings → Haptics) | ok     |

Playwright: `e2e/m2b.touch.spec.ts` → `artifacts/m2b-inventory.png`, `artifacts/m2b-rift.png` (cooldown forced via `__RIFTBORN.forceSkillCooldown`).

## M2c — stick feel (2026)

**Ursache:** Bewegung mit dem linken Stick fühlte sich schwach/statisch an und lief teils in falsche Richtung, weil Touch-Input ohne korrekte Screen→World-Umrechnung direkt als Bewegungsvektor genutzt wurde. Zudem gab es Probleme mit Smoothing/Pointer-Handling.

**Fix:** Analoger Stick mit `stickToMove` (Deadzone 0.12, volle Geschwindigkeit ab 0.5 Auslenkung), genau eine Screen→World-Umrechnung via `screenDirToWorldDelta` in `src/ui/TouchStick.ts`. Stick immer sichtbar in Ruheposition (unten links), leicht transparent; Trefferzone ganze linke untere Bildschirmhälfte außer SHIFT/DASH. Basis springt beim Aufsetzen zum Daumen, folgt bei Auslenkung über den Radius, kehrt beim Loslassen zur Ruheposition zurück. Richtung folgt dem Daumen sofort, Geschwindigkeit beschleunigt über ~80 ms.

## M2d — Wege und Strassen (Town roads)

**Ziel:** Um und durch die Stadt klar sichtbare Wege/Strassen, Pflaster in der Stadt, Erdweg nach aussen, verbunden zu POIs und zum Rift-Obelisk.

**Implementierung:**

- `src/world/Roads.ts` generiert deterministische Straßen (Plaza-Ring + 2–3 Tiles breite, leicht geschwungene Wege zu POIs/Obelisk) via `generateRoads()` aus Stadtzentrum + POI-Positionen.
- `src/world/Roads.core.test.ts`: Flood-Fill von Plaza erreicht jeden POI-Endpunkt, Roads in gültigen Bounds, deterministisches Ergebnis pro Seed.
- `src/world/MapGen.ts` integriert Roads in `paths`; Straßen verbinden nun klarer zu allen POIs und zum Rift-Obelisk.
- `src/scenes/WorldScene.ts` zeichnet Straßen deutlicher (Pflaster in Town-Nähe, Erdweg außerhalb) mit weichen Übergängen/Tint.
- Wege sind begehbar, keine neuen Kollisionsobjekte.

**Nachweis:** `artifacts/m2d-town-roads.png`, `artifacts/m2d-road-poi.png` (1024×473).
