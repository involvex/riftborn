import { Events, gameEvents } from '../core/EventBus';
import type { ActiveBounty, BountyKind } from '../types/save';

export type { ActiveBounty, BountyKind };

export type BountySaveSlice = {
  bounty: ActiveBounty | null;
  lastKind: BountyKind | null;
  cooldownLeft: number;
};

/** Craft results the forge contract can pay out (existing bench sinks). */
export const FORGE_REWARD_ITEMS = [
  'ashen_charm',
  'crystal_lens',
  'grove_tonic',
] as const;

const POOL: Array<Omit<ActiveBounty, 'progress'>> = [
  {
    kind: 'scout',
    label: 'Slay the Ash Scout',
    target: 1,
    rewardGold: 45,
    rewardXp: 40,
  },
  {
    kind: 'chests',
    label: 'Open wilderness chests',
    target: 2,
    rewardGold: 35,
    rewardXp: 30,
  },
  {
    kind: 'cull',
    label: 'Cull wilderness packs',
    target: 8,
    rewardGold: 40,
    rewardXp: 35,
  },
  {
    kind: 'shrine',
    label: 'Bless at the Ember Shrine',
    target: 1,
    rewardGold: 30,
    rewardXp: 25,
  },
  {
    kind: 'bramble',
    label: 'Crush the Ash Bramble',
    target: 1,
    rewardGold: 50,
    rewardXp: 45,
  },
  {
    kind: 'forge',
    label: 'Forge contract — cull for Bram',
    target: 10,
    rewardGold: 25,
    rewardXp: 35,
    rewardItemId: 'ashen_charm',
  },
  {
    kind: 'rift_clear',
    label: 'Clear a rift (Kill→Boss→Exit)',
    target: 1,
    rewardGold: 55,
    rewardXp: 50,
  },
  {
    kind: 'rift_boss',
    label: 'Slay a Rift Lord',
    target: 1,
    rewardGold: 60,
    rewardXp: 55,
  },
  {
    kind: 'rift_mat',
    label: 'Gather biome mats in a rift',
    target: 4,
    rewardGold: 40,
    rewardXp: 35,
  },
];

const KINDS: BountyKind[] = [
  'scout',
  'chests',
  'cull',
  'shrine',
  'bramble',
  'forge',
  'rift_clear',
  'rift_boss',
  'rift_mat',
];

function isBountyKind(v: unknown): v is BountyKind {
  return typeof v === 'string' && (KINDS as string[]).includes(v);
}

function pickForgeReward(rng = Math.random): string {
  const i = Math.floor(rng() * FORGE_REWARD_ITEMS.length);
  return FORGE_REWARD_ITEMS[i] ?? FORGE_REWARD_ITEMS[0]!;
}

function sanitizeBounty(raw: unknown): ActiveBounty | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Partial<ActiveBounty>;
  if (!isBountyKind(b.kind)) return null;
  const template = POOL.find((p) => p.kind === b.kind);
  if (!template) return null;
  const target = Math.max(1, Math.floor(Number(b.target) || template.target));
  const progress = Math.max(
    0,
    Math.min(target, Math.floor(Number(b.progress) || 0)),
  );
  const rewardItemId =
    typeof b.rewardItemId === 'string' && b.rewardItemId
      ? b.rewardItemId
      : template.rewardItemId;
  return {
    kind: b.kind,
    label: typeof b.label === 'string' && b.label ? b.label : template.label,
    target,
    progress,
    rewardGold: Math.max(
      0,
      Math.floor(Number(b.rewardGold) || template.rewardGold),
    ),
    rewardXp: Math.max(0, Math.floor(Number(b.rewardXp) || template.rewardXp)),
    ...(rewardItemId ? { rewardItemId } : {}),
  };
}

/**
 * Plaza bounties — accept via E at the board; progress from hub kills / chests.
 * Active bounty + cooldown persist across reload.
 */
export class BountySystem {
  active: ActiveBounty | null = null;
  private cooldownUntil = 0;
  private now = 0;
  private lastKind: BountyKind | null = null;

  tick(dt: number): void {
    this.now += dt;
  }

  load(slice: BountySaveSlice | null | undefined): void {
    this.now = 0;
    if (!slice) {
      this.active = null;
      this.lastKind = null;
      this.cooldownUntil = 0;
      return;
    }
    this.active = sanitizeBounty(slice.bounty);
    this.lastKind = isBountyKind(slice.lastKind) ? slice.lastKind : null;
    const left = Math.max(0, Number(slice.cooldownLeft) || 0);
    this.cooldownUntil = left;
  }

  toSave(): BountySaveSlice {
    return {
      bounty: this.active
        ? {
            kind: this.active.kind,
            label: this.active.label,
            target: this.active.target,
            progress: this.active.progress,
            rewardGold: this.active.rewardGold,
            rewardXp: this.active.rewardXp,
            ...(this.active.rewardItemId
              ? { rewardItemId: this.active.rewardItemId }
              : {}),
          }
        : null,
      lastKind: this.lastKind,
      cooldownLeft: Math.max(0, this.cooldownUntil - this.now),
    };
  }

  statusLine(): string | null {
    if (!this.active) return null;
    const a = this.active;
    return `${a.label} (${a.progress}/${a.target})`;
  }

  canAccept(): boolean {
    return !this.active && this.now >= this.cooldownUntil;
  }

  accept(rng = Math.random): ActiveBounty | null {
    if (!this.canAccept()) return null;
    const choices = POOL.filter((b) => b.kind !== this.lastKind);
    const pick = choices[Math.floor(rng() * choices.length)] ?? POOL[0]!;
    const rewardItemId =
      pick.kind === 'forge' ? pickForgeReward(rng) : pick.rewardItemId;
    this.active = {
      ...pick,
      progress: 0,
      ...(rewardItemId ? { rewardItemId } : {}),
    };
    this.lastKind = pick.kind;
    gameEvents.emit(Events.BOUNTY_CHANGED, { bounty: this.active });
    return this.active;
  }

  /** @returns completed bounty if this event finished it */
  noteScoutKill(): ActiveBounty | null {
    return this.bump('scout', 1);
  }

  noteChestOpen(): ActiveBounty | null {
    return this.bump('chests', 1);
  }

  noteWildernessKill(): ActiveBounty | null {
    // Forge contracts share wilderness cull progress.
    if (this.active?.kind === 'forge') return this.bump('forge', 1);
    return this.bump('cull', 1);
  }

  noteShrineUse(): ActiveBounty | null {
    return this.bump('shrine', 1);
  }

  noteRiftClear(): ActiveBounty | null {
    return this.bump('rift_clear', 1);
  }

  noteRiftBoss(): ActiveBounty | null {
    return this.bump('rift_boss', 1);
  }

  noteRiftMat(amount = 1): ActiveBounty | null {
    return this.bump('rift_mat', amount);
  }

  noteBrambleKill(): ActiveBounty | null {
    return this.bump('bramble', 1);
  }

  private bump(kind: BountyKind, amount: number): ActiveBounty | null {
    if (!this.active || this.active.kind !== kind) return null;
    this.active.progress = Math.min(
      this.active.target,
      this.active.progress + amount,
    );
    gameEvents.emit(Events.BOUNTY_CHANGED, { bounty: this.active });
    if (this.active.progress < this.active.target) return null;
    const done = this.active;
    this.active = null;
    this.cooldownUntil = this.now + 20;
    gameEvents.emit(Events.BOUNTY_CHANGED, { bounty: null });
    gameEvents.emit(Events.BOUNTY_COMPLETE, { bounty: done });
    return done;
  }
}
