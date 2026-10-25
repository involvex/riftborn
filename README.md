# Riftborn

2.5D isometric hybrid ARPG — Diablo-leaning combat, gathering/crafting, procedural rifts.

**Stack:** Bun · Vite · TypeScript · Phaser 4 · Electron (desktop) · Bun WebSocket (co-op)

## Play

```bash
bun install
bun run dev
```

Open http://localhost:5173 — create a **Warrior / Mystic / Mage**.

### Co-op (max 4)

```bash
bun run dev:all
```

In-game press **P**. If port `8787` is busy the server auto-picks the next free port and writes `public/coop-port.json` for the client.

### Desktop (Electron)

```bash
bun run desktop          # Vite + Electron together
bun run desktop:prod     # uses dist/ (no Vite needed)
bun run build:portable   # → release/Riftborn-*-portable.exe
```

## Controls

| Key   | Action                    |
| ----- | ------------------------- |
| WASD  | Move                      |
| LMB   | Attack                    |
| E     | Gather                    |
| F     | Craft (at bench)          |
| C     | Character / spend stats   |
| 3     | Equip tool                |
| 4–9   | Equip gear from bag       |
| Space | Dash                      |
| R     | Enter / exit rift dungeon |
| P     | Co-op join/leave          |
| Esc   | Pause / settings menu     |

## Progression

- Max level **50** · **2** unspent points per level
- Stats: Strength, Vitality, Intellect, Spirit
- Gear sets: Ashen, Riftbound, Bone (2pc / 4pc bonuses)

See [ROADMAP.md](ROADMAP.md) for what’s next.
