# Share Riftborn (one friend)

Send **one** build + this page. Ask for **one** top complaint — that
becomes the next evening’s only task.

## Share draft (Store testers)

### Audience

Windows friends who can redeem a Microsoft Store promo code.

### Announcement

Riftborn is on the Microsoft Store as a hidden tester listing:
https://apps.microsoft.com/store/detail/9PK475MX7JFQ — use the promo
code I send (Microsoft account on that PC). Hub → rifts → boss → exit;
report your one worst bug. Portable EXE and browser play stay available
if Store redeem fails.

### Free channels (pick one)

- DM / Discord with promo code + Store link
- GitHub Discussions (no codes in public posts — codes are single-use)

### Do not

- Paid ads, boosts, or new SaaS accounts
- Cold-message strangers at scale
- Post promo codes publicly

## Builds

**Microsoft Store (tester / promo code)**

Listing: https://apps.microsoft.com/store/detail/9PK475MX7JFQ  
Package: `bun run build:msstore` → `release/Riftborn-<ver>-store.appx`  
Publish update: see `docs/RELEASE.md` (`msstore publish … -id 9PK475MX7JFQ`).

**Desktop (Windows portable)**

```bash
bun run build:portable
```

Artifact: `release/Riftborn-<version>-portable.exe`.  
Close any running Riftborn.exe before rebuilding (Windows locks
`release/win-unpacked`).

**Web (itch / Pages)**

```bash
bun run build:itch
```

Zip: `release/riftborn-web.zip` → itch HTML5, or use the GitHub Pages
play link if you already publish it.

**Phone (offline APK)**

```bash
bun run mobile:build
```

APK: `mobile/android/app/build/outputs/apk/release/app-release.apk`  
Install yourself if you want — don’t interrupt their device session.

## How to play (send with the build)

1. **Move** — WASD (desktop) or left stick (phone).
2. **Attack** — left click / ATK; skills **1 / 2 / 3 / 4**. **Q** SHIFT
   layers in rifts (Ash ↔ Shadow).
3. **Interact** — **E** near Mira (shop), Bram (forge), Nix (trader),
   bounty board, chests, Ember Shrine.
4. **Rift** — **R** at the crystal · **Kill packs → Boss → Exit portal**.
   Optional side-room **Elite** (HUD token) — skip it or kill for a
   short damage buff before the boss. **B** returns to town (or die →
   hub at half HP).
5. **Chase** — class armor sets (Bone / Ashen / Riftbound). HUD shows
   `Ashen 1/4 · need Chest`; elites bias missing slots.
6. **Menus** — **I** bag, **M** map, **K** skills, **Esc** settings;
   phone: INV / MAP / MENU.
7. **Co-op (P)** — optional **hub sandbox** on the full **64×64** town
   (prototype — **no rifts**). Press **P** again to leave. You must leave
   co-op before entering a rift.

### What to expect

- Mid-rift **reload resumes** the same run (seed, mod, foes, loot, SHIFT,
  skill CDs, barrier, shrine buff). Corrupt saves still wake in town.
- Four biomes (Ash / Crystal / Grove / Salt) with distinct opening packs
  and boss tells.
- Depth D1–D10 scales packs/HP/loot; HUD shows `D#` + random rift mod.

### Feedback ask (paste to friend)

> Play one hub → rift → boss → town loop (or die once). Reply with
> **one** thing that felt worst (controls, clarity, combat, loot, crash).
> Optional: screenshot or “I was doing X when…”.

## Co-op note (hosts)

Local server: `bun run server` (or `bun run dev:all`). Friend needs the
same LAN URL the client prints when pressing **P**. Hub-only — if they
try a rift while connected, the game blocks with a clear toast.
