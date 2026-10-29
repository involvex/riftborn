# AGENTS.md — Riftborn

Guidance for AI coding agents working in this repo. Prefer this file over guessing.

## What this is

**Riftborn** — 2.5D isometric ARPG (Phaser 4 + Bun/Vite + Electron). Hub town + wilderness POIs + Diablo-style rifts. Solo-first; optional local co-op.

## Stack & layout

| Area                | Path                                                                         |
| ------------------- | ---------------------------------------------------------------------------- |
| Game entry          | `src/main.ts`                                                                |
| Scenes              | `src/scenes/` (`BootScene`, `CharacterCreateScene`, `WorldScene`, `UIScene`) |
| Entities            | `src/entities/`                                                              |
| Systems             | `src/systems/` (`GameState`, combat, inventory, skills, …)                   |
| Hub / POIs / chests | `src/world/MapGen.ts`                                                        |
| Painted sprites     | `public/assets/sprites/game/`                                                |
| Inventory icons     | `public/assets/icons/`                                                       |
| Co-op server        | `server/index.ts`                                                            |
| Electron shell      | `electron/main.cjs`                                                          |
| Mobile shell        | `mobile/` (Expo WebView → Vite/`dist`, Phaser `?touch=1`)                    |
| Agent smoke         | `e2e/hub.smoke.spec.ts`                                                      |

Package manager: **Bun**. TypeScript strict. Phaser **4.2.x**.

## Commands

```bash
bun install
bun run dev              # http://localhost:5173
bun run typecheck
bun run lint
bun run format
bun run format:check
bun run build
bun run test:smoke       # Playwright hub smoke → artifacts/hub.png
bunx playwright install chromium   # once per machine
```

Desktop: `bun run desktop` / `bun run desktop:prod`. Icons: put art in `electron/build/source-icon.jpg` then `bun run icons` (Electron ICO + Expo `mobile/assets` + favicon).

Mobile (Expo WebView, not a React Native rewrite of the game):

```bash
bun run mobile:dev      # Vite (if needed) + debug APK on device (LAN)
bun run mobile:build    # release APK with game bundled offline (no server)
bun run mobile:lan      # optional: only write mobile/.env
```

Touch HUD: `TouchControls` (stick / ATK / E / DASH) + raised ability bar. Desktop: `HotkeyDock` + flush `MiniMap`.

**Before declaring done:** typecheck + lint + format:check + build. After map/POI/town-safety changes, also run `bun run test:smoke`.

**Git:** commit/push only when the user asks. Do not amend pushed commits or force-push `main`.

## Agent visual / world verification

Phaser draws on a canvas — DOM selectors won’t see enemies or POIs.

1. Boot with `/?smoke=1` (skips menus; creates a fresh warrior in the hub).
2. Read live state via `window.__RIFTBORN` (`src/debug/RiftbornDebug.ts`):
   - `ready`, `snapshot()`, `hostilesNearTown(margin?)`, `nearestHostileDistToPlaza()`
   - Snapshot includes plaza bounds, player, enemies, POIs, chests, hub size.
3. Run `bun run test:smoke` — asserts hub size 64, ≥8 POIs, **no hostiles in town soft buffer (margin 10)**, writes `artifacts/hub.png`.
4. Agents can **Read** `artifacts/hub.png` after smoke for a visual check.

Do not rely on paste-a-screenshot alone after map/POI edits — prefer smoke + `__RIFTBORN`.

## Game design anchors

- **Hub:** `HUB_SIZE` 64 (`MapGen.ts`). Safe plaza `PLAZA` (~28–36). Soft buffer `nearTown()` keeps packs off the shops.
- **Town spawn:** `HUB_SPAWN` (~32.5, 33.5). Press **B** to return to town.
- **POIs:** camp, ruin, scout, shrine, warren, grove, watch, cairn — packs + often a loot chest.
- **Ember Shrine:** **E** near altar → timed damage buff (`SkillSystem.applyShrineBuff`), 90s shrine cooldown.
- **Ash Scout:** elite; kill toast names rarity; gear floor magic+.
- **Chests:** **E** to open — gold / mats / gear by `lootTier`.
- **Facing:** `facingFromDelta` in `IsoMath.ts` — flip sprites toward move/attack (screen X).
- **Passive HP regen:** `GameState.tickRegen` — none for ~5s after a hit; out of combat regenerates fast (~3.5–5.5% max HP/s + STA), stronger in town.
- **Inventory icons:** `ItemIcons.ts` maps gear/materials to `public/assets/icons/` (LootLoop-sourced painted icons).
- **Vendor:** Mira shop Buy/Sell tabs; item `sellValue` + `gearSellValue()`; **Sort** in bag; Esc → Settings → Auto-sell junk (common gear → gold on loot).
- **Nix (trader):** plaza west of spawn — Buy supplies/tonics, sell mats at 1.4×, Repair patch-up (`TraderSystem` / `TraderPanel`).
- **Attack feel:** sprite attack frames (sheet 10–13) + class-colored slash VFX in `Player.showSlash`. New swing art needs new frames in `public/assets/sprites/game/`.
- **Class skills (1/2/3):** all three unlocked at create — Warrior Leap/Cleave/Bash, Mystic Pulse/Slash/Seal, Mage Bolt/Nova/Barrier. Cast VFX in `SkillVfx.ts`; ranks via skill points (`K`).
- **Rifts:** depth 1–10 from player level (`RiftDepth.ts`); packs/HP/dmg/loot scale; Rift Lord + boss chest; HUD shows `D#`. Random run mods (`RiftModifiers.ts`: Dense / Glass / Gilded).
- **Saves:** 3 character slots on boot (`SaveStore`); legacy single save migrates to slot 1.
- **Bounty Board:** plaza NPC south of spawn — **E** accept (scout / chests / cull); HUD ★ line; progress + cooldown persist on character save.
- **Map:** corner minimap + **M** full overlay (`MapModel` / `MiniMap` / `MapOverlay`); top-down from layout data, not iso screenshot. Fog of war — tiles reveal within radius as you walk; **hub fog persists** on character save (`hubExplored`), rift fog resets each run.

## Controls (player)

WASD move · LMB attack · E interact/gather/chest/shrine · F craft · 1/2/3 skills · M map · R rift · B town · I inventory · C character · K skill tree · Esc settings.

Touch (`/?touch=1` or coarse/small): virtual stick · ATK · E · DASH · INV/MAP/MENU · ability bar 1/2/3.

## Audio

- Placeholders live in `public/assets/audio/sfx/` and `…/music/` (WAV).
- Regenerate: `bun run scripts/gen-placeholder-sfx.mjs`
- Load via `preloadAudio` in BootScene; playback through `AudioBus`
  (Phaser files first, WebAudio beeps as fallback).
- Hub vs combat music swaps in `WorldScene.loadZone`.
- Replace placeholders with ChipTone / sfxr / BeepBox exports (prefer `.ogg`)
  before jam submit — keep the same Phaser keys in `AudioBus.ts`.

## Jam asset strategy (Game Off / free tools)

- **Reuse first:** recolor existing sprites in `public/assets/sprites/game/`
  and icons in `public/assets/icons/` (Libresprite).
- **Character poses:** put sources in `public/assets/sprites/` as
  `{base}_idle.png`, `{base}_walk_0..n.png`, `{base}_attack_0..n.png`
  (prompts in `_prompts/poses.json`). Run `bun run sprites:process` →
  14-frame sheets in `game/spr_*.png`. Numbered walks beat idle-only bob.
- **Gen tools:** HF Qwen MCP, `D:\repos\involvex\image-worker`
  (`bun run src/index.ts generate …`), `D:\repos\image-wizard-cli` (Bing).
  Fill gaps: `bun run scripts/synth-extra-walk-poses.mjs`.
- **SFX:** [sfxr.me](https://sfxr.me/) / ChipTone → drop into
  `public/assets/audio/sfx/`.
- **Music:** [BeepBox](https://www.beepbox.co/) / JummBox loops →
  `public/assets/audio/music/`.
- Prefer **CC0** packs (Kenney, OpenGameArt). No paid assets for jam builds.
- **LPC enemies** (Charles Sanchez): `sprites/lpc/` → `spr_shade` /
  `spr_crawler` / `spr_wisp` / `spr_bat` (Nightwing elite) via
  `process-lpc-enemies.mjs` (**CC-BY-SA 3.0** — see
  `public/assets/ATTRIBUTION.md`).
- **Ash Scout / Nightwing:** named elites; kill toast + gear floor magic+.
- **Particles** (hackcraft.de CC-BY): `vfx/particles/` → combat bursts in
  `CombatVfx.ts` (`process-particles.mjs`).
- `bun run sprites:process` runs AI sheets, then LPC enemies, then particles.
- First-run tutorial: `TutorialOverlay` (`localStorage` key
  `riftborn.tutorial.v1`); skipped on `/?smoke=1`.

## Coding conventions

- Keep changes scoped; no drive-by refactors or unsolicited markdown.
- Match existing Phaser patterns (containers, `worldToScreen`, `snapToTile`).
- Prefer extending `MapGen` / `WorldScene` / systems over new frameworks.
- Line length ~80 where practical; Prettier owns formatting.
- Data-driven content in `src/data/*.json` when adding enemies, loot, skills, items.

## Save note

Save version is in `SaveStore` / `CharacterSave`. Old hub coordinates outside the current plaza snap back to town spawn on load.

## What not to do

- Don’t invent a second map generator — edit `generateHub` / `generateRift`.
- Don’t assert gameplay via DOM text alone; use `__RIFTBORN` or smoke.
- Don’t commit `artifacts/*.png` (gitignored); keep `artifacts/.gitkeep`.
- Don’t push without explicit user permission.
