/**
 * Pure telegraph decisions for enemy specials (no Phaser).
 * Enemy.update + WorldScene use these to pick a readable cue per phase.
 */

export type EnemyTelegraphKind = 'pounce' | 'wail' | 'shot' | 'rush';
export type EnemyTelegraphPhase = 'windup' | 'impact';

export type EnemyTelegraphStyle = {
  /** World-tile radius of the ground ring / burst. */
  radius: number;
  durationMs: number;
  color: number;
  shape: 'ring' | 'burst' | 'muzzle';
};

const STYLES: Record<
  EnemyTelegraphKind,
  Record<EnemyTelegraphPhase, EnemyTelegraphStyle>
> = {
  pounce: {
    windup: { radius: 0.55, durationMs: 280, color: 0xe8a0a0, shape: 'ring' },
    impact: { radius: 0.75, durationMs: 240, color: 0xffb0b0, shape: 'burst' },
  },
  wail: {
    windup: { radius: 3.0, durationMs: 420, color: 0xa8e0e8, shape: 'ring' },
    impact: { radius: 3.0, durationMs: 300, color: 0xc8f4f8, shape: 'burst' },
  },
  shot: {
    windup: { radius: 0.35, durationMs: 120, color: 0xf4e4c8, shape: 'muzzle' },
    impact: { radius: 0.5, durationMs: 200, color: 0xf4e4c8, shape: 'burst' },
  },
  rush: {
    windup: { radius: 0.7, durationMs: 240, color: 0xe0a070, shape: 'ring' },
    impact: { radius: 0.5, durationMs: 180, color: 0xe0a070, shape: 'burst' },
  },
};

export function enemyTelegraphKind(defId: string): EnemyTelegraphKind | null {
  switch (defId) {
    case 'enemy_shadow_wolf':
      return 'pounce';
    case 'enemy_rift_wraith':
      return 'wail';
    case 'enemy_bone_archer':
      return 'shot';
    case 'enemy_rift_goblin':
      return 'rush';
    default:
      return null;
  }
}

export function enemyTelegraphStyle(
  kind: EnemyTelegraphKind,
  phase: EnemyTelegraphPhase,
): EnemyTelegraphStyle {
  return STYLES[kind][phase];
}

/** Low tier keeps windups but trims concurrent cues harder than high. */
export function telegraphCap(profile: { tier: 'high' | 'low' }): number {
  return profile.tier === 'low' ? 4 : 12;
}
