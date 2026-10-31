/** Hub plaza spawn — used after interrupted rift loads. */
export const HUB_RESUME_SPAWN = { x: 32.5, y: 33.5 };

/**
 * Mid-rift progress is scene-local and not in the save.
 * Never resume into an incomplete rift — always boot the hub.
 */
export function hubResumeFromSave(data: {
  inRift: boolean;
  worldX: number;
  worldY: number;
}): {
  inRift: false;
  riftSeed: null;
  worldX: number;
  worldY: number;
} {
  if (data.inRift) {
    return {
      inRift: false,
      riftSeed: null,
      worldX: HUB_RESUME_SPAWN.x,
      worldY: HUB_RESUME_SPAWN.y,
    };
  }
  return {
    inRift: false,
    riftSeed: null,
    worldX: data.worldX,
    worldY: data.worldY,
  };
}
