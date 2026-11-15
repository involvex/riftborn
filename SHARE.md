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
2. **Attack** — left click / ATK button; skills **1 / 2 / 3 / 4** (or center ability bar). **Q** SHIFT layers in rifts.
3. **Interact** — **E** near Mira (shop), Bram (forge), Nix (scrapper), bounty board, chests, shrine.
4. **Rift** — **R** at the crystal; **Kill → Boss → Exit**. **B** returns to town.
5. **Menus** — **I** bag, **M** map, **Esc** settings; phone: INV / MAP / MENU.
6. **Co-op (P)** — optional hub sandbox on the full **64×64** town map
   (prototype — no rifts); leave co-op before entering a rift.

Ask your friend for **one** top complaint — that becomes the next evening’s only task.
