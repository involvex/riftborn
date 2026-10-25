# Riftborn desktop (Electron)

## Dev (starts Vite + Electron together)

```bash
bun run desktop
```

Uses `scripts/desktop.mjs` (waits on TCP `:5173`, then launches Electron). Do not run bare `electron .` unless Vite is already up, or use `desktop:prod`.

## Local production window (no Vite)

```bash
bun run desktop:prod
```

## Portable Windows `.exe`

```bash
bun run build:portable
```

Output: `release/Riftborn-0.1.0-portable.exe` — single file, no installer.
