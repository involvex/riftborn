# Game Off 2026 Roadmap for Riftborn

**Date:** 2026-10-29  
**Game:** Riftborn - 2.5D Isometric Action RPG (Phaser 4 + TypeScript + Bun)  
**Jam:** [Game Off 2026](https://itch.io/jam/game-off-2026) - Nov 1 - Dec 1, 2026  
**Status:** Pre-theme announcement (theme revealed Nov 1, 13:37 PT)

## Current State Analysis

### Strengths

- **Solid foundation**: Well-architected ARPG with hub, procedural rifts, 3 classes, gear system with sets/affixes/rarity
- **Polished core gameplay**: Combat feel, skills (3 per class), dash, attack facing, VFX
- **Progression systems**: Leveling 1-50, stat points, skill points, bounties, crafting/gathering
- **Exploration**: Hub with POIs, fog of war, minimap/full map overlay, procedural rifts with depth scaling
- **QoL features**: Inventory sorting, auto-sell junk, vendor/Nix trader, 3 save slots
- **Technical polish**: TypeScript strict, proper architecture (systems pattern), smoke tests, debug API
- **Cross-platform ready**: Web (Vite), Desktop (Electron), Mobile shell (Expo WebView)
- **Co-op foundation**: Basic local co-op server exists

### Weaknesses / Gaps for Jam

- **Audio**: No audio files found, AudioBus exists but likely minimal/placeholder - big gap for jam (audio category judged)
- **Theme flexibility**: Current theme is generic ARPG; needs to pivot quickly when theme announced Nov 1
- **First impression/hook**: May need a stronger hook or more "jammy" moment
- **Tutorial/onboarding**: New players might not know all mechanics
- **Balance/length**: Could use better pacing for a jam playthrough (15-30 min satisfying loop)
- **Visual polish**: Some systems functional but could use more juice/feedback
- **Narrative**: Minimal story/lore - some jams reward theme interpretation with narrative
- **Performance**: Should test on lower-end devices (browser)

## Game Off Judging Criteria (Informed by past jams)

Based on Game Off 2025 and general patterns:

1. **Overall** (most important) - Fun to play, cohesive experience
2. **Gameplay** - Mechanics feel good, engaging loop
3. **Graphics** - Visual style, polish
4. **Audio** - Music/SFX (critical - currently missing!)
5. **Innovation** - Unique twist
6. **Theme Interpretation** - How well it uses the announced theme

**Target:** Aim for a tight 10-20 minute experience with a strong hook that clearly interprets the theme.

## Roadmap Phases

### Phase 0: Pre-Theme Prep (Now - Oct 31) - CRITICAL

_Goal: Harden foundation and prepare for rapid theme adaptation_

| Task                                   | Priority | Effort | Details                                                                                                                         |
| -------------------------------------- | -------- | ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| **Audio foundation**                   | P0       | Medium | Add basic SFX (attack, hit, loot, UI clicks, walk) using free assets or generated. Add ambient music track. Wire into AudioBus. |
| **Polish combat juice**                | P0       | Medium | Screen shake on hit/death, better hit flash, particle effects, sound integration, camera feel.                                  |
| **Create "jam hook" prototype system** | P0       | Medium | Design a flexible mechanic system that can be re-skinned/re-themed quickly when theme drops.                                    |
| **Performance audit**                  | P0       | Small  | Test build size, load times. Optimize if needed. Ensure runs well in browser.                                                   |
| **Tutorial/First-time UX**             | P0       | Medium | Add simple in-game hints/tutorial overlay for new players. Explain core loop.                                                   |
| **Theme brainstorming doc**            | P0       | Small  | Create a doc of 10+ ways to reinterpret current ARPG systems for common themes.                                                 |
| **Build & test pipeline**              | P0       | Small  | Ensure `bun run build` works, itch.io upload ready (web build). Test in browser.                                                |

### Phase 1: Theme Response (Nov 1-3) - RACE

_Goal: Rapidly analyze theme and pivot core concept_

| Task                      | Priority | Effort | Details                                                                                       |
| ------------------------- | -------- | ------ | --------------------------------------------------------------------------------------------- |
| **Theme analysis**        | P0       | Small  | Decode theme, brainstorm interpretations. Pick strongest angle that fits 2.5D ARPG strengths. |
| **Core mechanic pivot**   | P0       | Large  | Reskin or add mechanic that embodies theme. Keep core combat intact but twist it.             |
| **Narrative framing**     | P0       | Medium | Add intro text/story that explains theme connection. Use UI/dialogue.                         |
| **Visual re-theme**       | P0       | Medium | Recolor palette, rename items/NPCs, adjust vibe to match theme. Don't need full art overhaul. |
| **Update title/branding** | P0       | Small  | Update game title if needed, or subtitle to show theme interpretation.                        |

### Phase 2: Core Jam Build (Nov 4-20) - BUILD

_Goal: Build the themed experience_

| Task                     | Priority | Effort | Details                                                                              |
| ------------------------ | -------- | ------ | ------------------------------------------------------------------------------------ |
| **Tighten game loop**    | P0       | Medium | Focus on 10-15 min satisfying loop. Maybe add win condition or climax.               |
| **Theme-driven content** | P0       | Large  | Add themed enemies, loot, rifts, or mechanics. Leverage existing procedural systems. |
| **Polish & juice**       | P0       | Medium | More VFX, screen effects, UI polish, feedback for all actions.                       |
| **Balance**              | P0       | Medium | Tune difficulty curve for short playthrough. Make first run engaging.                |
| **Add "wow" moment**     | P0       | Medium | One memorable setpiece/boss/ability that showcases theme.                            |
| **Audio integration**    | P0       | Medium | Full SFX pass + themed music.                                                        |

### Phase 3: Polish & Submit (Nov 21 - Dec 1) - SHIP

_Goal: Bug fixes, polish, submission_

| Task                      | Priority | Effort | Details                                                                        |
| ------------------------- | -------- | ------ | ------------------------------------------------------------------------------ |
| **Bug bash**              | P0       | Medium | Test full playthrough multiple times, fix crashes/softlocks.                   |
| **Performance pass**      | P0       | Small  | Optimize for web, test on different browsers.                                  |
| **README & itch.io page** | P0       | Small  | Write compelling description, gameplay GIF/video, controls, theme explanation. |
| **GitHub cleanup**        | P0       | Small  | Ensure repo is public, clean commits, add LICENSE if needed.                   |
| **Final build & submit**  | P0       | Small  | Build for web, upload to itch.io, submit to jam with repo link.                |
| **Playtest with others**  | P1       | Medium | Get feedback, fix critical issues.                                             |

## Asset Generation & Sourcing Strategy (Free Tools Only)

Since only free tools are available, use this strategy to create/obtain all assets:

### Free Tools

| Asset Type                     | Tool                                                                                                                                                                                                               | Notes                                                                                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pixel Art Sprites**          | [Libresprite](https://libresprite.github.io/) (fully free, open source fork of Aseprite)                                                                                                                           | Best for character sprites, animations, tilesets. Recommended over paid alternatives.                                                              |
| **AI Pixel Art (Bing/DALL-E)** | [image-wizard-cli](D:\repos\image-wizard-cli) - Uses Bing Image Creator/DALL-E 3 via cookies                                                                                                                       | **Highly recommended** - Free with Microsoft account/Bing credits. Can generate high quality images. Need to improve it for pixel art/game assets. |
| **AI Pixel Art (Web)**         | [Ideogram](https://ideogram.ai/) (great at pixel art), [Bing Image Creator](https://bing.com/images/create/), [Leonardo.ai](https://leonardo.ai/) (free tier)                                                      | Use for concepts or to generate base sprites then edit heavily in Libresprite to match style.                                                      |
| **Free Cloudflare Image API**  | [free-image-generation-api](https://github.com/saurav-z/free-image-generation-api) or [image-worker](https://github.com/cloudflare/templates/tree/main/text-to-image-template) in `D:\repos\involvex\image-worker` | Deploy your own Cloudflare Worker with Workers AI - **100,000 free calls/day**. Use for quick concept art or placeholders.                         |
| **Tilesets/Maps**              | [Tiled](https://www.mapeditor.org/) (free, open source)                                                                                                                                                            | For creating/editing tilemaps if needed. Phaser can load Tiled JSON.                                                                               |
| **SFX**                        | [sfxr.me](https://sfxr.me/) (web-based), [JSFXR](https://pro.sfxr.me/), [ChipTone](https://sfbgames.itch.io/chiptone) (free)                                                                                       | Generate 8-bit style SFX instantly. Perfect for ARPG sounds.                                                                                       |
| **Music**                      | [BeepBox](https://www.beepbox.co/) (free web-based), [JummBox](https://jummbus.bitbucket.io/), [FamiStudio](https://famistudio.org/) (free), [Bosca Ceoil](https://boscaceoil.net/) (free)                         | Create chiptune/8-bit music. Export as OGG/MP3.                                                                                                    |
| **UI Elements**                | [Kenney UI Assets](https://kenney.nl/assets/ui-pack) (CC0)                                                                                                                                                         | Free UI packs under CC0 license - perfect for UI elements.                                                                                         |
| **Asset Packs**                | [Kenney](https://kenney.nl/) (CC0), [OpenGameArt.org](https://opengameart.org/) (filter CC0), [Itch.io Free Assets](https://itch.io/game-assets/free) (verify license)                                             | Always verify license allows jam/commercial use. **Prefer CC0**.                                                                                   |

#### Image Generation Strategy (Use ALL free options)

1. **Bing/DALL-E via image-wizard-cli (PRIMARY)** - Best quality, free with Bing credits. Needs to be rewritten/improved for pixel art game assets.
2. **Cloudflare Workers AI** - Good for bulk generation, self-hosted, 100k calls/day free
3. **Ideogram/Bing web** - Quick tests, great at pixel art
4. **Libresprite** - Post-process ALL AI images to pixel art style, reduce colors, fix details
5. **Kenney/OpenGameArt** - Fallback if generation isn't working

#### Image Wizard CLI Improvements Needed

For game asset generation, rewrite `D:\repos\image-wizard-cli` to add:

- **Pixel art mode** - Auto-add "pixel art, 16x16, 8-bit, retro game sprite" to prompts
- **Batch prompts** - Generate multiple different sprites from a list
- **Style presets** - Save prompts for characters, enemies, tiles, icons, UI
- **Size/aspect control** - Better control over image dimensions
- **Auto-postprocess** - Integration with image processing to convert to pixel art (reduce colors, scale down)
- **Game asset naming** - Auto-organize outputs by type (sprites/enemies/items)
- **Template system** - Pre-made prompts for ARPG assets (warrior sprite, goblin enemy, etc.)
- **Faster workflow** - Less interactive prompts for batch generation

#### Cloudflare Workers AI Image Generation (Free Option)

For quick placeholder art or concepting:

1. Deploy [free-image-generation-api](https://github.com/saurav-z/free-image-generation-api) to your Cloudflare account (free tier gives 100k calls/day)
2. Or use the CLI in `D:\repos\involvex\image-worker` with `bun dev:cli generate`
3. Both use Cloudflare Workers AI (free models like Stable Diffusion XL)
4. **Note:** Generated images may need to be cleaned up/redrawn in Libresprite to match the game's pixel art style - best used for inspiration/placeholders, not final art

### Asset Workflow

1. **Leverage existing assets first** - Check `public/assets/sprites/game/` and `public/assets/icons/`. The game already has painted sprites and icons - reuse and recolor them.
2. **Generate missing SFX** - Use sfxr.me/ChipTone for attack, hit, loot, UI, skill sounds. Export as .ogg preferred for web.
3. **Generate music** - Use BeepBox for 1-2 short loops (hub theme, combat theme). Keep simple and under 2 minutes, loopable.
4. **Edit sprites, don't recreate** - Use Libresprite to recolor/palette-swap existing sprites to match theme. This is faster and maintains art style consistency.
5. **AI as last resort** - If completely new sprites needed, generate with Ideogram/Bing, then heavily edit in Libresprite to match pixel art style and scale.
6. **Optimize for web** - Keep sprites small, use existing sprite sheet patterns, compress audio, prefer .ogg over .mp3 where possible.

### Quick Asset Creation Plan

| Asset                               | Method                                                 | Time      | Priority |
| ----------------------------------- | ------------------------------------------------------ | --------- | -------- |
| **Combat SFX** (swing/hit/death)    | sfxr.me/ChipTone - generate variations                 | 30-45 min | P0       |
| **UI SFX** (click/hover/open)       | sfxr.me - short blips                                  | 10 min    | P0       |
| **Loot/Shrine SFX**                 | sfxr.me - pickup/sparkle sounds                        | 10 min    | P0       |
| **Hub Music**                       | BeepBox - simple loop (30-60 sec)                      | 1-2 hours | P0       |
| **Combat Music**                    | BeepBox - more intense loop (45-90 sec)                | 1-2 hours | P0       |
| **Sprite concepts** (enemies/items) | **image-wizard-cli** with Bing/DALL-E - batch generate | 1-2 hours | P0       |
| **Theme sprites** (if needed)       | Use image-wizard-cli + Libresprite to pixelate/recolor | 2-4 hours | P0       |
| **Theme recolors** (if needed)      | Libresprite palette swap on existing sprites           | 1-2 hours | P1       |
| **UI polish**                       | Kenney CC0 UI or recolor existing                      | 30-60 min | P1       |

**Critical:** All tools are 100% free. No paid assets, no paid tools. Always verify CC0/public domain licensing.

## Build Agent Instructions

### General Rules for Build Agents

1. **Always run checks**: Before committing, run `bun run typecheck && bun run lint && bun run format:check && bun run build`
2. **Test after map changes**: If modifying MapGen/POIs, run `bun run test:smoke`
3. **Keep changes scoped**: Don't do massive refactors - iterate on existing systems
4. **Preserve architecture**: Follow existing patterns (systems in `src/systems/`, scenes in `src/scenes/`)
5. **Web-first**: Game must run well in browser on itch.io
6. **Performance conscious**: Keep bundle size reasonable, avoid heavy allocations in update loops

### Phase 0 Specific Tasks (Detailed)

#### Add Audio System

**Files to modify:** `src/core/AudioBus.ts`, `src/scenes/BootScene.ts`, add `public/assets/audio/`

```typescript
// Suggested approach:
// 1. Create public/assets/audio/ directory
// 2. Add audio files: sfx/*.ogg, music/*.ogg
// 3. Load in BootScene preloader
// 4. Wire SFX calls in combat/loot/UI events
// 5. Add music management (hub vs combat)
```

#### Combat Juice

**Files to modify:** `src/entities/Player.ts`, `src/entities/Enemy.ts`, `src/scenes/WorldScene.ts`

- Add screen shake on player/enemy hit
- Add hit flash (tint animation)
- Add particle effects for impacts
- Improve camera follow feel
- Add damage numbers (floating text)

#### Tutorial System

**Files to modify:** `src/scenes/UIScene.ts`, create `src/ui/TutorialOverlay.ts`

- Show on first run (track in localStorage)
- Highlight key controls (WASD, LMB, E, skills, dash)
- Explain core loop (explore hub -> enter rift -> fight -> loot)
- Dismissible with "Got it" button

### Theme Adaptation Strategies

Since theme is unknown until Nov 1, prepare flexible approaches:

| Potential Theme          | Adaptation Strategy            | Implementation Ideas                                          |
| ------------------------ | ------------------------------ | ------------------------------------------------------------- |
| **CONNECTION/LINKS**     | Link mechanic between entities | Chain attacks between enemies, teleport links, bond abilities |
| **CYCLE/LOOP/REPEAT**    | Time loops/reincarnation       | Each death/rest gives bonus, loop-based progression           |
| **GROWTH/SHRINK**        | Size mechanic                  | Grow by defeating enemies, shrink to access areas             |
| **LIGHT/DARK/SHADOW**    | Light/dark zones               | Torches reveal, shadows dangerous, visibility mechanic        |
| **HEAT/COLD/FIRE/ICE**   | Elemental theme                | Already have elements? Lean into temperature mechanic         |
| **FRAGMENT/BREAK/APART** | Shatter mechanic               | Enemies split, weapons break to form new ones                 |
| **RUST/DECAY/REPAIR**    | Decay and repair loop          | Gear decays, must repair, or repair is power                  |
| **WAVES** (like 2025)    | Wave-based survival            | Already have rifts with waves of enemies - emphasize this     |
| **SECRETS** (like 2024)  | Hidden content focus           | More secrets in hub/rifts, reveal with exploration            |
| **SCALE** (like 2023)    | Size/proportion                | Giant enemies, tiny areas, scale-based puzzles                |

**Key:** Keep existing systems but reframe them. The rift system is very flexible - can become "waves", "cycles", etc.

## Quick Start for Build Agents

```bash
# Setup
bun install
bun run dev  # Test locally

# Before making changes
git status
bun run typecheck

# After changes
bun run typecheck && bun run lint && bun run format:check && bun run build
bun run test:smoke  # if map changes
```

## Submission Checklist

- [ ] Game is playable in browser (web build works)
- [ ] Clear theme interpretation visible in game
- [ ] Fun for 10-15 minute playthrough
- [ ] Audio present (SFX + music) - **REQUIRED**
- [ ] All assets use free tools/licenses (CC0 preferred)
- [ ] No game-breaking bugs
- [ ] README explains game and theme
- [ ] Public GitHub repo with source code
- [ ] Submitted to itch.io with correct link to repo
- [ ] Title, description, screenshots/GIF on itch.io page

## Immediate Action Items (Do First)

For build agents starting NOW:

1. **[ ] Install free tools** - Download/install [Libresprite](https://libresprite.github.io/), bookmark [sfxr.me](https://sfxr.me/), [BeepBox](https://www.beepbox.co/)
2. **[ ] Setup image-wizard-cli** - Review and improve `D:\repos\image-wizard-cli` for pixel art game assets (add presets, batch mode, pixel art prompts)
3. **[ ] Setup Bing image gen** - Configure image-wizard-cli with Bing cookies for free DALL-E 3 access
4. **[ ] Create audio directory** - `mkdir -p public/assets/audio/sfx public/assets/audio/music`
5. **[ ] Generate core SFX** - Use sfxr.me for attack, hit, death, loot, UI click sounds (8-12 sounds)
6. **[ ] Create simple music** - Use BeepBox to make 2 loops (hub + combat), export as .ogg
7. **[ ] Add audio loading** - Modify BootScene to preload audio files
8. **[ ] Wire audio** - Add SFX calls to combat/loot/UI in AudioBus
9. **[ ] Add combat juice** - Implement screen shake, hit flashes, damage numbers
10. **[ ] Create tutorial** - Add first-time player guidance overlay
11. **[ ] Test build** - Ensure everything compiles and runs with audio
12. **[ ] Create jam branch** - `git checkout -b gameoff-2026` to isolate jam work
13. **[ ] Prepare for theme** - Review this roadmap daily after Nov 1 announcement

## Image Wizard CLI Enhancement Plan

For `D:\repos\image-wizard-cli`, add these features:

| Feature                       | Priority | Details                                                                                              |
| ----------------------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| **Pixel Art Preset**          | P0       | Add `--pixel` flag that auto-appends "pixel art, 16-bit, retro game sprite, no shading, flat colors" |
| **Batch Mode**                | P0       | Add support for reading prompts from file (`prompts.txt`) to generate multiple assets at once        |
| **Game Asset Presets**        | P0       | Add built-in presets: character, enemy, item, icon, tile, ui-element with optimized prompts          |
| **Output Organization**       | P0       | Auto-organize by type into subfolders (sprites/enemies/items/tiles)                                  |
| **Style Templates**           | P1       | Save custom prompt templates for consistent art style                                                |
| **Image Post-processing**     | P1       | Option to auto-convert to pixel art (reduce colors, nearest neighbor upscale) using sharp/jimp       |
| **Size Control**              | P1       | Better aspect ratio/size control for different asset types                                           |
| **Retry/Rate Limit Handling** | P1       | Better handling of Bing's rate limits with delays                                                    |

## Tips for Jam Success

1. **Narrow scope**: Better to have one polished mechanic than ten half-baked ones
2. **Show don't tell**: Let gameplay demonstrate theme interpretation
3. **First 30 seconds matter**: Make it immediately clear what to do
4. **Lean into strengths**: Riftborn's combat feel and rift system are strong - build around them
5. **Theme is everything**: Even a small mechanic that perfectly captures theme can score well
6. **Juice is cheap**: Screen shake, sounds, particles go a long way
7. **Playtest often**: If it's not fun to you, it won't be fun to judges
8. **Timebox**: Don't gold-plate - ship something fun on time
9. **Use existing assets**: Recolor/reuse before creating from scratch
10. **Keep it web-friendly**: Test in browser frequently

---

**Last Updated:** 2026-10-29  
**Status:** Ready for Phase 0 execution
