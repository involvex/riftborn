/**
 * Pure context resolve for the E / interact button.
 * Priority: loot → interactables (npc / portal / chest) → softer
 * targets (shrine / bench / gather) → none.
 */

export type InteractKind =
  'loot' | 'npc' | 'portal' | 'chest' | 'shrine' | 'bench' | 'gather' | 'none';

export type NpcInteractRole = 'vendor' | 'crafter' | 'board' | 'trader';

export type InteractCandidate = {
  kind: Exclude<InteractKind, 'none'>;
  x: number;
  y: number;
  /** Stable id for apply-side lookup. */
  id?: string;
  npcRole?: NpcInteractRole;
  /** Rift exit vs enter obelisk. */
  portalExit?: boolean;
};

export type ResolvedInteract =
  | {
      kind: 'none';
      label: string;
      dimmed: true;
    }
  | {
      kind: Exclude<InteractKind, 'none'>;
      label: string;
      dimmed: false;
      x: number;
      y: number;
      id?: string;
      npcRole?: NpcInteractRole;
      portalExit?: boolean;
    };

/** World-unit reach per kind (matches WorldScene try* ranges). */
export const INTERACT_RANGE: Record<Exclude<InteractKind, 'none'>, number> = {
  loot: 1.55,
  npc: 1.9,
  portal: 2.0,
  chest: 1.5,
  shrine: 1.6,
  bench: 1.8,
  gather: 1.45,
};

/** Lower = higher priority. Same tier → nearest wins. */
const PRIORITY: Record<Exclude<InteractKind, 'none'>, number> = {
  loot: 0,
  npc: 1,
  portal: 1,
  chest: 1,
  shrine: 2,
  bench: 2,
  gather: 3,
};

export type InteractResolveOpts = {
  /** Override gather reach (player.gatherRange). */
  gatherRange?: number;
};

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

export function labelForInteract(c: InteractCandidate): string {
  switch (c.kind) {
    case 'loot':
      return 'Loot';
    case 'npc':
      return 'Talk';
    case 'portal':
      return c.portalExit ? 'Exit' : 'Rift';
    case 'chest':
      return 'Open';
    case 'shrine':
      return 'Bless';
    case 'bench':
      return 'Craft';
    case 'gather':
      return 'Mine';
    default:
      return 'E';
  }
}

/**
 * Pick the best interact action near the player.
 * Pure — no Phaser / scene state.
 */
export function resolveInteractAction(
  player: { x: number; y: number },
  candidates: readonly InteractCandidate[],
  opts: InteractResolveOpts = {},
): ResolvedInteract {
  let best: InteractCandidate | null = null;
  let bestPri = Number.POSITIVE_INFINITY;
  let bestDist = Number.POSITIVE_INFINITY;

  for (const c of candidates) {
    const range =
      c.kind === 'gather' && opts.gatherRange != null
        ? opts.gatherRange
        : INTERACT_RANGE[c.kind];
    const d = dist(player.x, player.y, c.x, c.y);
    if (d > range) continue;
    const pri = PRIORITY[c.kind];
    if (pri < bestPri || (pri === bestPri && d < bestDist)) {
      best = c;
      bestPri = pri;
      bestDist = d;
    }
  }

  if (!best) {
    return { kind: 'none', label: 'E', dimmed: true };
  }

  return {
    kind: best.kind,
    label: labelForInteract(best),
    dimmed: false,
    x: best.x,
    y: best.y,
    id: best.id,
    npcRole: best.npcRole,
    portalExit: best.portalExit,
  };
}
