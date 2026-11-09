# Riftborn

2.5D isometric hybrid ARPG — Diablo-leaning combat, gathering/crafting, procedural rifts.

**Stack:** Bun · Vite · TypeScript · Phaser 4 · Electron (desktop) · Bun WebSocket (co-op)

## Play

- **Im Browser:** [involvex.github.io/riftborn/play/](https://involvex.github.io/riftborn/play/)
- **itch.io:** [involvex.itch.io/riftborn](https://involvex.itch.io/riftborn)
- **Lokal entwickeln:**

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

### Releases

Prebuilt releases are published via GitHub Actions and include a Windows portable `.exe` and an Android `.apk`. See [docs/RELEASE.md](docs/RELEASE.md) for details.

## Controls

| Key       | Action                   |
| --------- | ------------------------ |
| WASD      | Move                     |
| LMB       | Attack (hold to repeat)  |
| 1 / 2 / 3 | Class skills             |
| E         | Gather / open / interact |
| F         | Craft (at bench)         |
| C         | Character / spend stats  |
| I         | Inventory (big bag)      |
| K         | Skill tree               |
| M         | Map overlay              |
| 3         | Equip tool               |
| Space     | Dash                     |
| R         | Enter / exit rift        |
| B         | Return to town           |
| Q         | SHIFT — world shift      |
| P         | Co-op join/leave         |
| Esc       | Pause / settings menu    |

Keys are rebindable in **Esc → Settings**. **Q (SHIFT)** is the Game Off 2026
theme hook: kills fill shift energy, then SHIFT swaps the world layer —
phase through foes on the other layer and open layer-locked gates.

## Progression

- Max level **50** · **2** unspent points per level
- Stats: Strength, Vitality, Intellect, Spirit
- Gear sets: Ashen, Riftbound, Bone (2pc / 4pc bonuses)

## Screenshots

![Riftborn Town](docs/screenshots/town.png)

![Riftborn Rift](docs/screenshots/rift.png)

![SHIFT — Ash layer](docs/screenshots/shift-ash.png)

![SHIFT — Shadow layer](docs/screenshots/shift-shadow.png)

Touch/mobile gameplay: [docs/screenshots/touch-rift.png](docs/screenshots/touch-rift.png)

## Website

[https://involvex.github.io/riftborn/](https://involvex.github.io/riftborn/) — statische Landingpage in [`site/`](site/), deployed via GitHub Actions. In den Repository-Settings unter **Pages** muss die Quelle auf **GitHub Actions** stehen.

See [ROADMAP.md](ROADMAP.md) for what’s next.
