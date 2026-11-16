import type { RiftRunSave } from '../types/save';
import { isValidRiftRun } from './RiftRunPersist';

/** Hub plaza spawn — used after interrupted / corrupt rift loads. */
export const HUB_RESUME_SPAWN = { x: 32.5, y: 33.5 };

/**
 * Resume mid-rift when a valid `riftRun` blob is present.
 * Corrupt / missing blob + `inRift` still boots the plaza (safe).
 */
export function hubResumeFromSave(data: {
  inRift: boolean;
  worldX: number;
  worldY: number;
  riftSeed?: number | null;
  riftRun?: RiftRunSave | null;
}): {
  inRift: boolean;
  riftSeed: number | null;
  worldX: number;
  worldY: number;
  riftRun: RiftRunSave | null;
  resumedRift: boolean;
} {
  if (data.inRift && isValidRiftRun(data.riftRun)) {
    const run = data.riftRun;
    return {
      inRift: true,
      riftSeed: run.seed,
      worldX: data.worldX,
      worldY: data.worldY,
      riftRun: run,
      resumedRift: true,
    };
  }
  if (data.inRift) {
    return {
      inRift: false,
      riftSeed: null,
      worldX: HUB_RESUME_SPAWN.x,
      worldY: HUB_RESUME_SPAWN.y,
      riftRun: null,
      resumedRift: false,
    };
  }
  return {
    inRift: false,
    riftSeed: null,
    worldX: data.worldX,
    worldY: data.worldY,
    riftRun: null,
    resumedRift: false,
  };
}
