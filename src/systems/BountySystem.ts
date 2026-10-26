import { Events, gameEvents } from '../core/EventBus';

export type BountyKind = 'scout' | 'chests' | 'cull';

export type ActiveBounty = {
  kind: BountyKind;
  label: string;
  target: number;
  progress: number;
  rewardGold: number;
  rewardXp: number;
};

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
];

/**
 * Session bounties from the plaza board (not persisted).
 * Accept via E at the board; progress from hub kills / chests.
 */
export class BountySystem {
  active: ActiveBounty | null = null;
  private cooldownUntil = 0;
  private now = 0;
  private lastKind: BountyKind | null = null;

  tick(dt: number): void {
    this.now += dt;
  }

  statusLine(): string | null {
    if (!this.active) return null;
    const a = this.active;
    return `${a.label} (${a.progress}/${a.target})`;
  }

  canAccept(): boolean {
    return !this.active && this.now >= this.cooldownUntil;
  }

  accept(): ActiveBounty | null {
    if (!this.canAccept()) return null;
    const choices = POOL.filter((b) => b.kind !== this.lastKind);
    const pick =
      choices[Math.floor(Math.random() * choices.length)] ?? POOL[0]!;
    this.active = { ...pick, progress: 0 };
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
    return this.bump('cull', 1);
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
