# AUDIT — Enemy & combat animations (C7)

Sheets are **20 frames × 128×128** (`idle 0–3`, `walk 4–9`, `attack 10–13`,
`hit 14–15`, `death 16–19`). Pipeline: `bun run sprites:process` →
`process-sprites.mjs` + `process-lpc-enemies.mjs` +
`append-combat-frames.mjs`. Hit/death derived from attack/idle (knockback,
squash, flash, dissolve) — see `AnimFrames.ts` / `scripts/lib/combat-frames.mjs`.
Runtime registers idle/walk/attack/hit/death. Facing is **2-way** via
`spriteFacingFromDelta` + `flipX` (sticky on screen N/S; no 8-dir sheets).

## Player sheets

| Key                    | Source                 | idle      | walk      | attack      | hit             | death           | dirs      |
| ---------------------- | ---------------------- | --------- | --------- | ----------- | --------------- | --------------- | --------- |
| `spr_player_male`      | `hero_warrior_*` poses | yes (0–3) | yes (4–9) | yes (10–13) | derived (14–15) | derived (16–19) | 2 (flipX) |
| `spr_player_female`    | `hero_female_*`        | yes       | yes       | yes         | derived         | derived         | 2         |
| `spr_player_nonbinary` | `hero_mystic_*`        | yes       | yes       | yes         | derived         | derived         | 2         |
| `spr_player_mystic`    | same mystic poses      | yes       | yes       | yes         | derived         | derived         | 2         |
| `spr_player_mage`      | `hero_mage_*`          | yes       | yes       | yes         | derived         | derived         | 2         |

Pose sources under `public/assets/sprites/`: `{base}_idle.png`,
`_walk_0..n` / `_walk.png`, `_attack_0..n` / `_attack.png`. No `_hit` /
`_death` sources — derived in pipeline. Runtime: `Player.flashHit` plays
`${key}_hit`.

## Enemy sheets

| Key             | Source                      | idle        | walk        | attack      | hit     | death   | dirs                 |
| --------------- | --------------------------- | ----------- | ----------- | ----------- | ------- | ------- | -------------------- |
| `spr_shade`     | LPC `ghost.png` (row 2)     | yes         | yes         | yes         | derived | derived | 2 (LPC down + flipX) |
| `spr_crawler`   | LPC `snake.png`             | yes         | yes         | yes         | derived | derived | 2                    |
| `spr_wisp`      | LPC `bee.png`               | yes         | yes         | yes         | derived | derived | 2                    |
| `spr_bat`       | LPC `bat.png` (Nightwing)   | yes         | yes         | yes         | derived | derived | 2                    |
| `spr_rift_lord` | `enemy_rift_lord.png` synth | yes (synth) | yes (synth) | yes (synth) | derived | derived | 2                    |

Legacy AI pedestals (`enemy_shade.png` etc.) are **not** used for sheets;
LPC path owns shade/crawler/wisp/bat. Rift lord is `synthOnly` bob/lunge from
idle. Runtime: `Enemy.flashHit` / `playDeath` use sheet anims (tint/fade
fallback if missing).

## AnimGen / runtime

- No separate `AnimGen.ts`; attack-gen lock is `attackGen` on Player/Enemy
  (`AnimGen.core.test.ts` covers stale `ANIMATION_COMPLETE`).
- Procedural fallbacks in `SpriteAtlas` emit 20 frames (incl. derived
  hit/death).
- Facing helper: `spriteFacingFromDelta` / `applyFlipFacing` in `IsoMath.ts`
  — shared by Player + Enemy.

## Gaps for C7

1. ~~**Hit / death frames**~~ — done (derived + registered).
2. ~~**Facing**~~ — done (unified sticky 2-dir + 4-dir cardinal).
3. **Combat feedback** — hitstop / crit shake / readable damage numbers
   (constants, toggleable).
