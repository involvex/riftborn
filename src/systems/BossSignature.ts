/**
 * Per-biome boss tell — one warn → punish beat, shared cadence.
 * Ash hops layers; Crystal wails; Grove charges; Salt volleys.
 */

export type BossSignatureKind = 'shift_hop' | 'kite_wail' | 'charge' | 'volley';

export function bossSignatureKind(defId: string): BossSignatureKind {
  switch (defId) {
    case 'crystal_lord':
      return 'kite_wail';
    case 'grove_alpha':
      return 'charge';
    case 'salt_warden':
      return 'volley';
    default:
      return 'shift_hop';
  }
}

/** Telegraph kind for EnemyTelegraphVfx / playEnemyTelegraph. */
export function bossSignatureTelegraph(
  kind: BossSignatureKind,
): 'wail' | 'rush' | 'shot' | 'pounce' {
  switch (kind) {
    case 'kite_wail':
      return 'wail';
    case 'charge':
      return 'rush';
    case 'volley':
      return 'shot';
    default:
      return 'wail';
  }
}

export function bossSignatureWarnToast(opts: {
  bossName: string;
  kind: BossSignatureKind;
  nextLayerName?: string;
}): string {
  const { bossName, kind, nextLayerName } = opts;
  switch (kind) {
    case 'kite_wail':
      return `${bossName} gathers a crystal wail — interrupt or step out`;
    case 'charge':
      return `${bossName} digs in — brace for a charge`;
    case 'volley':
      return `${bossName} nocks a salt volley — sidestep`;
    default:
      return `${bossName} will shift to ${nextLayerName ?? 'the other layer'}…`;
  }
}

export function bossSignaturePunishToast(opts: {
  bossName: string;
  kind: BossSignatureKind;
  layerName?: string;
}): string {
  const { bossName, kind, layerName } = opts;
  switch (kind) {
    case 'kite_wail':
      return `${bossName} unleashes a crystal wail`;
    case 'charge':
      return `${bossName} charges`;
    case 'volley':
      return `${bossName} looses a salt volley`;
    default:
      return `${bossName} shifts to ${layerName ?? 'Ash'}!`;
  }
}

/** Fan angles (radians) for salt volley around aim. */
export const BOSS_VOLLEY_SPREAD = [-0.35, 0, 0.35] as const;

/** Rotate aim vector around `from` by `angleRad` for a volley spoke. */
export function volleyAimPoint(
  from: { x: number; y: number },
  to: { x: number; y: number },
  angleRad: number,
): { x: number; y: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return {
    x: from.x + dx * cos - dy * sin,
    y: from.y + dx * sin + dy * cos,
  };
}
