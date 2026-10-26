# Share Riftborn (one friend)

## Builds

**Desktop (Windows portable)**

```bash
bun run build:portable
```

Artifact: `release/Riftborn-0.1.0-portable.exe` (~130 MB).  
Close any running Riftborn.exe before rebuilding (Windows locks `release/win-unpacked`).

**Phone (offline APK)**

```bash
bun run mobile:build
```

APK: `mobile/android/app/build/outputs/apk/release/app-release.apk`  
Install: `adb install -r mobile/android/app/build/outputs/apk/release/app-release.apk`  
(Already built once after this doc — rebuild with `bun run mobile:build` when game changes.)

## How to play (send with the build)

1. **Move** — WASD (desktop) or left stick (phone).
2. **Attack** — left click / ATK button; skills **1 / 2 / 3** (or center ability bar).
3. **Interact** — **E** near Mira (shop), Bram (forge), Nix (scrapper), bounty board, chests, shrine.
4. **Rift** — **R** at the crystal; clear packs → boss → exit. **B** returns to town.
5. **Menus** — **I** bag, **M** map, **Esc** settings; phone: INV / MAP / MENU.

Ask your friend for **one** top complaint — that becomes the next evening’s only task.
