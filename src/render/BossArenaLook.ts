/**
 * Boss-room floor wash + ring cues — reuses BiomeLook accents so the
 * arena reads as a setpiece without new art or topology.
 */

import type { BiomeLook } from './BiomeLook';

export type ArenaRoom = { x: number; y: number; w: number; h: number };

/** Last carved room is always the boss chamber in DungeonGen. */
export function dungeonBossRoom(
  rooms: ArenaRoom[] | undefined,
): ArenaRoom | null {
  if (!rooms || rooms.length === 0) return null;
  return rooms[rooms.length - 1]!;
}

export function tileInArenaRoom(
  tx: number,
  ty: number,
  room: ArenaRoom,
): boolean {
  return (
    tx >= room.x && tx < room.x + room.w && ty >= room.y && ty < room.y + room.h
  );
}

/** Warm/cool multiply so boss floors separate from corridor tint. */
export function bossArenaFloorTint(look: BiomeLook): number {
  const f = look.floorTint;
  const a = look.accent;
  const mix = (fc: number, ac: number, t: number) =>
    Math.min(255, Math.round(fc * (1 - t) + ac * t));
  const fr = (f >> 16) & 0xff;
  const fg = (f >> 8) & 0xff;
  const fb = f & 0xff;
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  // Pull toward accent + lift brightness slightly.
  const r = Math.min(255, mix(fr, ar, 0.28) + 18);
  const g = Math.min(255, mix(fg, ag, 0.28) + 14);
  const b = Math.min(255, mix(fb, ab, 0.28) + 10);
  return (r << 16) | (g << 8) | b;
}

export function bossArenaEdgeAlpha(look: BiomeLook): number {
  return Math.min(0.95, look.edgeAlpha + 0.22);
}

/** Speckle density in arena (lower = denser). */
export function bossArenaSpeckEvery(look: BiomeLook): number {
  return Math.max(5, Math.floor(look.speckEvery * 0.55));
}

export type ArenaPhase = 'idle' | 'boss' | 'exit';

export function arenaRingColor(look: BiomeLook, phase: ArenaPhase): number {
  if (phase === 'exit') return 0x7ad0ff;
  if (phase === 'boss') return 0xff9040;
  return look.accent;
}

export function arenaRingAlpha(phase: ArenaPhase): number {
  if (phase === 'exit') return 0.75;
  if (phase === 'boss') return 0.7;
  return 0.4;
}
