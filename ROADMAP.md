# Riftborn — Living roadmap

Solo evenings, one shippable slice at a time. Prefer **feel → content → systems → polish → share**.

## Shipped

- Phaser 4 isometric hub + **procedural rift dungeons**
- Classes: **Warrior / Mystic / Mage**; level **1–50**, stat points, character menu
- Gear (5 slots), affixes/rarity, **set bonuses**; crafting, gathering, dash, local save
- Hub **64×64**, plaza soft buffer, **POIs**, loot chests, Ember Shrine, Ash Scout
- Inventory icons, **Sort**, vendor **Buy/Sell**, **auto-sell junk**
- Passive OOC HP regen; attack facing + slash VFX; agent smoke / `__RIFTBORN`
- **Class skills 1/2/3/4** distinct (Leap / Pulse / Bolt kits + Battle Cry / Rift Step / Chain Surge) + cast VFX
- **SHIFT (Q)** Ash/Shadow layers in rifts; biome mats toast into craft sink
- **Rift depth 1–10** from level (packs / HP / dmg / loot); Rift Lord + boss chest
- Death flash/shake + rarity loot sting; **3 character slots** on boot
- Plaza **Bounty Board** (scout / chests / cull / shrine / bramble / **forge contract**)
- **Rift modifiers** (Dense / Glass / Gilded)
- **Nix** material / repair trader (supplies, mat buyback, patch-up)
- **Bounties persist** across reload (active + board cooldown)
- **Minimap** + **M** map overlay (top-down)
- **HUD polish** (HotkeyDock) + **touch controls** + Expo WebView shell
- **Map fog of war** (explore to reveal); **hub fog persists** on save
- **Custom app icon** (Electron + Expo via `bun run icons`)
- Electron portable + self-hosted co-op (basic); share kit in `SHARE.md`
- **FOV-safe Low fillrate** (M7b buffer + camera zoom); touch stick analog speed
- **A1b jam audio** — ChipTone-style SFX + hub/combat loops (CC0 synth)
- Game Off itch pack (`docs/ITCH_PAGE.md`, `bun run build:itch`)
- **Co-op Fix-light** — hub sandbox clamps/spawns on full **64×64** (`clampHubCoord`)
- Biome craft sinks: **Ashen Charm / Crystal Lens / Grove Tonic / Salt Charm**
- Hub elite **Ash Bramble** (grove); also in shattered_woods rift mix
- Inventory **drag-to-equip** (desktop); double-click / double-tap still work
- Craft / bounty / shrine **SFX juice**
- CI: typecheck + lint + format + unit + smoke (`.github/workflows/ci.yml`)
- **Depth rules** D4 Hardened / D7 Relentless / D10 Apex (stack on rift mods + HUD)
- **Forge contract** bounty pays a craft-sink item (ashen/crystal/grove)
- Fourth rift biome **Salzwüste** (`salt_wastes`) + **Salt Warden** + salt shard craft sink
- **One passive per class** (Iron Will / Rift Attunement / Arcane Reservoir)
- **BiomeLook** — rift floors tinted per biome + accents + void background
- **HubLook** — plaza glow, POI floor washes, dirt-road edges, warmer plaza lanterns
- **Combat readability** — warmer hit flash/knock, Low-tier hit bursts, skill hit VFX, boss scale-in + crit kill juice
- **LoopBeat / portals** — zone fade + portal sting; exit gate at boss anchor; HUD phase pulse
- **Loot readability** — magic+ drop icons/beams, boss chest look, rarity-gated loot juice
- **Boss arena beat** — biome wash + phase ring in boss room (idle → boss → exit)
- **Biome pack identity** — opening packs per biome (grind / kite / rush / poke)
- **Boss signature beats** — Ash hop / Crystal wail / Grove charge / Salt volley
- **Full rift resume** — mid-rift reload restores seed/mod/progress/foes/loot/SHIFT/fog/skill CDs/barrier/shrine buff (`riftRun` v5)
- **8-dir facing** — screen octant + lean + slash aim; LPC trash has 4 facing rows, heroes stay 1-row
- **Share-ready** — `SHARE.md` + `docs/ITCH_PAGE.md` current loop; co-op hub toasts (`CoopGate`)
- **Optional rift champion** — side-room elite off the boss path; skip freely; kill pays this-run buff + magic gear (not kill-goal)
- **D3+ kill quota ~60%** — skip trash / take elite / fight boss is a real route (D1–D2 stay ~80%+)
- **SHIFT split pack** — one ash goblin + shadow archer fight per rift; Q swaps who is solid
- **Second skill fork per class** — War Charge / Rift Echo / Arc Spark (stack with the first forks)
- **Champion minimap ping** — gold spur marker (fog-piercing) on mini + full map
- **Champion loot line** — spur kill stamps `Champion's …` on the magic+ drop + prize toast
- **Rift clear names the spur** — return card says Elite slain/skipped + Champion's drop when present
- **Rare set variety** — second set per class (Bulwark / Grove / Spark); set armor ~12–28% of armor drops
- **Set drop juice** — set armor is magic+; drop toast `Grove · Legs · 2/4 · need Feet`
- **Set bonus UI (C)** — both class kits with lit/dim 2pc·4pc + need slots
- **Hub set sink** — Mira chase buy / Bram Set Patch / forge bounty pays missing slot
- **Set breakpoint toast** — equip hitting 2pc/4pc toasts the bonus + loot sting
- **4pc skill glow** — ability bar gold rim on family skills while 4pc is worn
- **Skill fork clarity (K)** — bar summary + ON/FORK/→ badges; replaced starters dim
- **Hub sink proximity** — Mira/Bram toast + E prompt when a chase slot is open
- **Unique boss / elite sprites** — Crystal / Grove / Salt bosses + Ash Scout / Ash Bramble / Rift Mender own sheets
- **Microsoft Store tester build** — AppX via `bun run build:msstore`; hidden listing + promo codes live ([9PK475MX7JFQ](https://apps.microsoft.com/store/detail/9PK475MX7JFQ)); CI token scope + `openExternal` allowlist
- **Store tester triage (v0.2.2)** — skip AUMID override under `process.windowsStore`; restore fullscreen setting on boot; Store URL on site + RELEASE; package update path documented
- **2× floor tiles + biome floors** — 256×128 iso PNGs; `TILE_ART_SCALE` 0.25; plaza warm/wet variants
- **Branded chrome** — splash/menu art, in-scene menu crest, hold-to-mine, hub floor chunks
- **Audio sliders** — master / SFX / music volume + mute; music restores correctly after mute
- **Share announcement** — Store tester draft + free channels live in `SHARE.md`
- **Desktop chrome baseline** — window title + AUMID/taskbar grouping, persisted/clamped bounds, F11 and Settings fullscreen, first-run tutorial overlay with debug replay
- **Hero 8-dir sheets** — Warrior/Female/Mystic/Mage `2560×1024` (8×20) in `game/`; N/NE/E/S painted idles + W/NW/SW mirrors; SE keeps real walk; attack synth
- **Replay intro (I6)** — Settings → Replay intro clears tutorial + first-session keys and shows the welcome modal (desktop + touch)
- **EOL config (I1)** — `.gitattributes` `* text=auto eol=lf` + Prettier `endOfLine: auto` (landed with verify/CI alignment; no mass reformat)
- **Non-mutating verify (I2)** — `bun run verify` = format:check → typecheck → lint → unit → build → smoke (no mutating `format`)
- **Full e2e suite (I3)** — `bun run test:e2e` runs all 23 Playwright tests; CI uses full suite; screenshots assert non-blank canvas via `e2e/canvasShot.ts`
- **Co-op host URL (I4)** — Pause → Co-op edits/persists `coopHostUrl`; server drops unused enemy/node broadcasts; hub seed aligned to **42**; LAN URL in `coop-port.json`
- **CI build + mobile (I5)** — CI already runs `bun run build` + `bun check -p mobile`; confirmed green locally (prod bundle + Expo shell types)

## Now

Post-Store feature track. One unchecked slice at a time (`/ship`).

| #   | Slice                  | Why it matters                                    | Done when                                                                              |
| --- | ---------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| ☐   | **Version + tag (I7)** | Root 0.2.2 / mobile 0.2.0 / Gradle code 1; no tag | One version source (root → mobile/Gradle) and a `v0.2.2` tag so `release.yml` can fire |

Next `/ship` takes I7. Player-facing quick wins stay under **Next**.

## Next — verification & infra

Keep the green gate honest; these are one-session slices, no new frameworks.

| #   | Slice                   | Why it matters                                    | Done when                                                                              |
| --- | ----------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| ✓   | **EOL config fix**      | Windows checkout has CRLF; Prettier expects LF    | Shipped: `.gitattributes` + Prettier `endOfLine: auto`; `format:check` green Win/Linux |
| ✓   | **Non-mutating verify** | `verify` ran `format` and hid CI failures         | Shipped: `verify` uses format:check; documented in AGENTS                              |
| ✓   | **Full e2e suite**      | 13 of 15 specs never run; blank canvas can pass   | Shipped: `test:e2e` (23 tests) + CI job; `screenshotCanvasNonBlank` on canvas shots    |
| ✓   | **Co-op host URL**      | `ws://127.0.0.1` fails on remote devices          | Shipped: Pause → Co-op URL + seed 42 + no unused enemy/node broadcast                  |
| ✓   | **CI build + mobile**   | CI never bundled prod or checked the APK shell    | Shipped: CI `build` + `bun check -p mobile`; verified green                            |
| ✓   | **Replay intro**        | Intro cannot be reopened by a player              | Shipped: Settings → Replay intro via `resetIntroProgress` + `ui:showTutorial`          |
| I7  | **Version + tag**       | Root 0.2.2 / mobile 0.2.0 / Gradle code 1; no tag | One version source (root → mobile/Gradle) and a `v0.2.2` tag so `release.yml` can fire |

## Next — player-facing quick wins

All extend existing systems; each lands with a pure helper + unit test and, where visual, a touch screenshot.

| #   | Slice                   | Why it matters                               | Done when                                                                                     |
| --- | ----------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------- |
| P1  | **Wire shard reroll**   | `AffixReroll` is complete but unreachable    | "Reroll · 1 shard" button on selected gear in bag; shards spent, affixes rolled, save + toast |
| P2  | **`P#` pressure HUD**   | Pressure changes difficulty but is invisible | `pressureHudLabel` shown on rift HUD + clear card (with run time)                             |
| P3  | **Boss HP strip**       | Boss fight has no readable HP bar            | Boss name + HP% bar in HUD, hidden on death/exit; `isBoss` added to debug snapshot            |
| P4  | **Bag filter chips**    | 48 slots with no quick rarity view           | All / Gear / Mats / Magic+ / Set chips + rarity sort; touch-safe cells                        |
| P5  | **Auto-sell threshold** | Junk toggle is all-or-nothing                | Off / Common / Magic+ setting, migrating the old boolean                                      |
| P6  | **Save export/import**  | Local-only saves have no backup              | JSON download/upload with `migrateCharacterSave` validation + overwrite confirm               |
| P7  | **Show FPS toggle**     | FPS readout is always on                     | Setting defaults Off, persists, reachable in Settings                                         |
| P8  | **Hotkeys reset bug**   | Reset wipes _all_ settings, not just keys    | Hotkeys page resets only `hotkeys` via partial save + unit test                               |
| P9  | **Music fallback**      | SFX have WebAudio fallback, music does not   | Music still plays (or degrades cleanly) when the Phaser cache misses                          |
| P10 | **Gate debug API**      | Cheat hooks ship to every player             | `installRiftbornDebug` only under `import.meta.env.DEV` or `?smoke=1`; smoke still works      |

Skip inventing new frameworks — extend `WorldArt` / `WorldScene` / `Npc` /
`LootChest` / `public/assets/props/`.

## Release-gated

Need credentials, an external account, or a human decision — not evening slices.

- **Android signing** — implement documented `KEYSTORE_*` secrets in Gradle + `release.yml`, or label the debug-signed APK tester-only
- **Store ops** — centralize the hardcoded product ID, add package aliases for `msstore-*` scripts, fix `IsGameDvrEnabled` drift
- **itch desktop parity** — web ZIP exists; add a portable-EXE channel with version tags
- **Public Store discoverability / flights** — only when stop-acquisition is intentionally lifted

## Done — feel & look (core loop)

Prefer sessions that make the existing Hub → Rift → Boss → Exit loop
**clearer and prettier**. Skip jam-theme work and new systems unless they
earn their keep in feel.

| #   | Slice                    | Why it matters                   | Done when                                                                                            |
| --- | ------------------------ | -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| ✓   | **Rift biomes readable** | Same tiles — biomes alike        | Shipped: `BiomeLook` floor tint / accents / void bg + enter biome name                               |
| ✓   | **Hub atmosphere**       | Town still reads flat            | Shipped: `HubLook` plaza glow / POI tints / dirt-road edges / lanterns                               |
| ✓   | **Combat readability**   | Hits/boss moments still soft     | Shipped: warmer hit flash/knock, Low-tier hit bursts, skill hit VFX, boss scale-in + crit kill juice |
| ✓   | **LoopBeat / portals**   | Enter/clear/exit still soft      | Shipped: zone fade + portal sting; exit gate at boss anchor; HUD phase pulse                         |
| ✓   | **Loot readability**     | Payoff after combat soft         | Shipped: magic+ drop icons/beams, boss chest look, rarity-gated loot juice                           |
| ✓   | **Boss arena beat**      | Boss room = any hall             | Shipped: biome wash + phase ring in boss room (idle → boss → exit)                                   |
| ✓   | **Phone combat feel**    | Shake on/off; magic loot strobes | Shake Off/Low/Full + Reduce flash; magic no camera flash; loot gap; player hurt squash; touch verify |
| ✓   | **Phone HUD sharpness**  | Auto→Low 0.65 made type mushy    | Auto→Medium 0.85; Low stays FPS hatch; 16px world labels; TOUCH_FONT_MIN 15; ACT pad floor           |

## Done — content (keep after feel)

| #   | Slice                      | Why it matters                            | Done when                                                            |
| --- | -------------------------- | ----------------------------------------- | -------------------------------------------------------------------- |
| ✓   | **Biome pack identity**    | Biomes tint floors; packs fight alike     | Shipped: opening packs (grind / kite / rush / poke) + skewed mixes   |
| ✓   | **Boss signature beats**   | Arena looks special; fight is one pattern | Shipped: hop / wail / charge / volley on shared beat cadence         |
| ✓   | **Set chase readability**  | Loot pops; keeping gear is thin           | Shipped: missing-slot drop bias + HUD/bag "need X" from 1pc          |
| ✓   | **Rare set variety**       | One set per class; set armor too common   | Alternate set per class; set drops ~12–28%; chase owned incomplete   |
| ✓   | **Set drop juice**         | Rare sets still felt like generic loot    | Magic+ floor on set armor; chase toast names set / slot / need       |
| ✓   | **Set bonus UI (C)**       | Active sets only; other kit invisible     | Both class kits; ✓/· 2pc·4pc; need slots from bag + worn             |
| ✓   | **Hub set sink**           | Set chase only advances in rifts          | Mira chase offer; Bram Set Patch (ore/scrap); forge bounty set piece |
| ✓   | **Set breakpoint toast**   | Activating 2pc/4pc was silent             | Equip toast names bonus; magic/rare sting                            |
| ✓   | **4pc skill glow**         | Family buff invisible on the bar          | Gold rim + warm fill on buffed 1/2/3/4 while 4pc worn                |
| ✓   | **Skill fork clarity (K)** | Second forks easy to miss vs starters     | Header bar 1–4; ON/FORK/→ badges; replaced nodes dim; spend toast    |
| ✓   | **Hub sink proximity**     | Mira/Bram chase easy to walk past         | Enter toast + floating E · Chase/Patch when sink open                |

## Done — lite mobile ARPG loop (v0.2.0)

Phone-first feel, post-cap chase, plaza chrome trimmed. Itch / store /
co-op rifts stayed parked.

| #   | Slice                   | Why it matters                                                     | Done when                                                                          |
| --- | ----------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| ✓   | **Phone combat weight** | Stick cancels chase; dash has no i-frames; trash hits with no tell | Dash i-frames, melee/rush windups, stick+ATK blend, Low buffer scale               |
| ✓   | **Thumb layout**        | Skills far from ATK; word pads                                     | Skill fan by ATK, icon pads, stick-biased cleave, hit haptic                       |
| ✓   | **Replay ladder**       | Depth 10 / L50 plateaus                                            | Pressure step, skill forks, named affixes, set family, shard reroll, rift bounties |
| ✓   | **Plaza / boss look**   | Vector town + reskin bosses                                        | Proximity labels, figure shadows, boss silhouette accents                          |

## Done — rift verbs

In-rift choice, SHIFT fight, build fork, map ping, and named drop are in.

| #   | Slice                         | Why it matters                          | Done when                                                                                 |
| --- | ----------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------- |
| ✓   | **Plaza building sprites**    | Rectangle inns beside the hero          | Shop / Forge / Inn use iso PNGs (`sprites:plaza`); smoke hub size OK                      |
| ✓   | **Plaza NPC + props**         | Triangle Mira / board / chest / obelisk | Mira, Bram, Nix, board, chest, obelisk + warm lantern/well/crate/anvil                    |
| ✓   | **Optional champion room**    | Middle of rift was only a kill counter  | Spur elite off path; HUD `Elite`; buff on kill; kill goal ignores it                      |
| ✓   | **D3+ kill quota ~60%**       | Full clear before boss blocked skips    | `riftKillGoalFillRatio` is 0.6 from D3 up; D1–D2 stay ~80%+                               |
| ✓   | **SHIFT split pack**          | SHIFT was only a gate key               | One ash/shadow pair per rift; enter toast; Veiled still overrides                         |
| ✓   | **Second skill forks**        | One fork left build choice thin         | Charge / Echo / Spark replace bash / slash / bolt; stack with forks 1                     |
| ✓   | **Champion minimap ping**     | Spur easy to miss on the map            | Gold `champion` marker + fog pierce; Spur in M legend                                     |
| ✓   | **Champion loot line**        | Spur buff alone is soft payoff          | Drop renamed `Champion's …`; prize toast on kill                                          |
| ✓   | **Rift clear names the spur** | Clear card skipped the Elite choice     | Clear / death / abandon line says Elite slain or skipped; names `Champion's …` if dropped |

## Done — 8-dir sprite rows

Octant logic, LPC trash rows, and hero 8-dir sheets are in.

| #   | Slice                 | Why it matters                                | Done when                                                                                      |
| --- | --------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| ✓   | **8-dir sprite rows** | Octant logic shipped; hero sheets still flipX | Multi-row anim keys + 1-row flip fallback; LPC shade/crawler/wisp/bat rebuilt as 4 facing rows |
| ✓   | **Hero 8-dir sheets** | Heroes still 1-row flip while trash has rows  | 8×20 player sheets; facing idles in `assets-src/sprites/facing/`; `process-hero-facing.mjs`    |

## Done — playtest combat nits

| #   | Slice                    | Why it matters                           | Done when                                                                          |
| --- | ------------------------ | ---------------------------------------- | ---------------------------------------------------------------------------------- |
| ✓   | **Playtest combat nits** | Landscape touch combat felt unfair/muddy | Pack members spread to free tiles; FPS above stick; first-session hint below SHIFT |

## Done — 2× tiles + biome floors

| #   | Slice                       | Why it matters                         | Done when                                                                                       |
| --- | --------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| ✓   | **2× tiles + biome floors** | Phone floors still soft after HUD pass | 16 Bing jobs → 256×128 PNGs; `TILE_ART_SCALE` 0.25; biome `floorTiles` + hub plaza/wet variants |

## Done — unique boss / elite sprites

| #   | Slice                       | Why it matters                                                  | Done when                                                                                            |
| --- | --------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| ✓   | **Unique boss / elite art** | Biome bosses + Ash Scout / Bramble / Mender shared trash sheets | Distinct `spr_*` sheets; four boss keys unique; painted idles via Bing → `process-sprites` synthOnly |

## Done — systems polish

| #   | Slice                | Why it matters                | Done when                                                                                                                         |
| --- | -------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| ✓   | **Full rift resume** | Reload mid-rift wiped the run | Shipped: `riftRun` v5 snapshot (seed/mod/foes/loot/SHIFT/fog/skill CDs/barrier/shrine buff); HubResume plaza only if blob corrupt |
| ✓   | **8-dir facing**     | Only screen-X flip read flat  | Shipped: octant + lean + slash aim vector; LPC trash 4 rows, hero/boss sheets still flipX                                         |
| ✓   | **Share-ready**      | Friend build + copy stale     | Shipped: SHARE + itch copy (resume/biomes/sets/co-op); leave/connect hub toasts                                                   |

## Later (parked, with why)

Ordered roughly by leverage for a solo ARPG; each needs more than one evening
or an external decision.

### Content & chase

- **Share Replay intro:** free note in `SHARE.md` (Esc → Settings → Replay intro)
- **Share hero 8-dir:** free announcement draft in `SHARE.md` (turn-in-place reads as real facings)
- **Hero facing walk paint** — non-SE rows still bob from idle; optional painted walk cycles per facing
- **Named uniques** — 1–2 boss/elite uniques per biome (not full Diablo DB)
- **Fifth rift biome** — new floor pack + boss signature + craft sink
- **Bounty board season 2** — weekly-ish rotating objectives (local clock)
- **Stash / shared bank** — cross-character mats + gear parking (3 slots)

### Combat & builds

- **Active skill gems / runes lite** — socket one modifier on a bar skill
- **Elite affix telegraph** — named pack mods with readable windups
- **Boss phase 2** — one biome lord gets a clear second pattern

### Co-op & platforms

- Co-op rifts + authoritative loot / gear sync (hub sandbox stays prototype until I4 lands)
- itch.io desktop channel parity with Store version tags (see Release-gated)
- Follow-up Store triage from promo redeemers (crash/blocker list → next package)
- App Store packaging for Expo shell (no `ios/` or EAS config yet)

### Systems / long shots

- Seasons, trading, seamless open world
- Cloud save / Microsoft account sync (only if Store demands it)

## Pace guide (solo)

- **1 slice / session** when tired; **2** if hot
- Always leave a green `bun run verify` (format:check → typecheck → lint → unit → build → smoke); never put mutating `format` in verify/CI
- Prettier EOL config keeps Windows and Linux checks aligned — never "fix" a local CRLF warning with a mass `format` run
- Share a portable build with one friend once a slice feels good

## Archive

Jam-era planning lives in [`GAME_OFF_2026_ROADMAP.md`](GAME_OFF_2026_ROADMAP.md) (**archive** — do not treat as current tasks). Living truth is this file.
