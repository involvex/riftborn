# Riftborn art assets

## Style lock

- Reference: `ref/style_hero_idle.png`
- Look: dark fantasy isometric ARPG (Diablo readability), HD pixel art, muted ash/bone/blood/slate palette

## Pipeline

1. Generate sources with `agy` (preferred) into `sprites/*.png` (black background).
2. If `agy` image quota is exhausted, Hugging Face Qwen Image can fill gaps.
3. Run `bun run sprites:process` → transparent 14-frame sheets in `sprites/game/`.
4. Phaser loads `sprites/game/` in `BootScene.preload`.

Frame layout (128×128): idle 0–3, walk 4–9, attack 10–13 (bob/nudge derived from idle art until real anim sheets exist).
