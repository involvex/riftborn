# AUDIT — Enemy & combat animations (C7)

Sheets are **14 frames × 128×128** (`idle 0–3`, `walk 4–9`, `attack 10–13`).
Pipeline: `bun run sprites:process` → `process-sprites.mjs` (heroes + rift
lord) + `process-lpc-enemies.mjs` (shade/crawler/wisp/bat). Runtime:
`SpriteAtlas.registerAnims` only registers idle/walk/attack. Facing today is
**2-way** via `facingFromDelta` + `flipX` (no 8-dir / 4-dir sheets).

## Player sheets

| Key                    | Source                 | idle      | walk      | attack      | hit         | death       | dirs      |
| ---------------------- | ---------------------- | --------- | --------- | ----------- | ----------- | ----------- | --------- |
| `spr_player_male`      | `hero_warrior_*` poses | yes (0–3) | yes (4–9) | yes (10–13) | **missing** | **missing** | 2 (flipX) |
| `spr_player_female`    | `hero_female_*`        | yes       | yes       | yes         | **missing** | **missing** | 2         |
| `spr_player_nonbinary` | `hero_mystic_*`        | yes       | yes       | yes         | **missing** | **missing** | 2         |
| `spr_player_mystic`    | same mystic poses      | yes       | yes       | yes         | **missing** | **missing** | 2         |
| `spr_player_mage`      | `hero_mage_*`          | yes       | yes       | yes         | **missing** | **missing** | 2         |

Pose sources under `public/assets/sprites/`: `{base}_idle.png`,
`_walk_0..n` / `_walk.png`, `_attack_0..n` / `_attack.png`. No `_hit` /
`_death` sources. Runtime hit = tint flash (`Player.flashHit`); death =
UI/scene fade, not sheet frames.

## Enemy sheets

| Key             | Source                      | idle        | walk        | attack      | hit         | death       | dirs                 |
| --------------- | --------------------------- | ----------- | ----------- | ----------- | ----------- | ----------- | -------------------- |
| `spr_shade`     | LPC `ghost.png` (row 2)     | yes         | yes         | yes         | **missing** | **missing** | 2 (LPC down + flipX) |
| `spr_crawler`   | LPC `snake.png`             | yes         | yes         | yes         | **missing** | **missing** | 2                    |
| `spr_wisp`      | LPC `bee.png`               | yes         | yes         | yes         | **missing** | **missing** | 2                    |
| `spr_bat`       | LPC `bat.png` (Nightwing)   | yes         | yes         | yes         | **missing** | **missing** | 2                    |
| `spr_rift_lord` | `enemy_rift_lord.png` synth | yes (synth) | yes (synth) | yes (synth) | **missing** | **missing** | 2                    |

Legacy AI pedestals (`enemy_shade.png` etc.) are **not** used for sheets;
LPC path owns shade/crawler/wisp/bat. Rift lord is `synthOnly` bob/lunge from
idle. Runtime: `Enemy.flashHit` (white tint + nudge); death = alpha/scale
tween fade (`Enemy.applyDamage`) — comment notes no death frames.

## AnimGen / runtime

- No separate `AnimGen.ts`; attack-gen lock is `attackGen` on Player/Enemy
  (`AnimGen.core.test.ts` covers stale `ANIMATION_COMPLETE`).
- Procedural fallbacks in `SpriteAtlas` also emit 14 frames (idle/walk/attack
  only).

## Gaps for C7

1. **Hit / death frames** — derive in pipeline (knockback, squash, white
   flash, 4–6 dissolve) and register `${key}_hit` / `${key}_death`.
2. **Facing** — keep 2-dir + flipX as the real sheet model; unify helper so
   enemies/players share the same screen-X mapping (no moonwalk).
3. **Combat feedback** — hitstop / crit shake / readable damage numbers
   (constants, toggleable).
