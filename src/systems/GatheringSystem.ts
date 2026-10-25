import { Events, gameEvents } from '../core/EventBus';
import type { NodeDef } from '../types/game';
import nodesData from '../data/nodes.json';
import type { InventorySystem } from './InventorySystem';

const nodes = nodesData as Record<string, NodeDef>;

export function getNodeDef(id: string): NodeDef | undefined {
  return nodes[id];
}

export class GatheringSystem {
  private readonly inventory: InventorySystem;

  constructor(inventory: InventorySystem) {
    this.inventory = inventory;
  }

  /** Base gather DPS; tools multiply. */
  gatherDamagePerHit(): number {
    return 8 * this.inventory.gatherMultiplier();
  }

  grantNodeDrops(nodeId: string): void {
    const def = nodes[nodeId];
    if (!def) return;
    for (const drop of def.drops) {
      const qty =
        drop.qtyMin +
        Math.floor(Math.random() * (drop.qtyMax - drop.qtyMin + 1));
      if (qty > 0) this.inventory.add(drop.itemId, qty);
    }
    gameEvents.emit(Events.NODE_DEPLETED, { nodeId });
  }
}
