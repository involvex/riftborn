/**
 * Riftborn self-hosted co-op server (max 4 players).
 * Authoritative movement + session reward writeback tokens.
 *
 * Run: bun run server
 * Client: press P in-game to connect to ws://127.0.0.1:8787
 */

import type { ServerWebSocket } from 'bun';
import { generateHub } from '../src/world/MapGen';
import enemiesData from '../src/data/enemies.json';
import nodesData from '../src/data/nodes.json';
import loottables from '../src/data/loottables.json';

const PORT = Number(process.env.PORT ?? 8787);
const MAX_PLAYERS = 4;
const TICK_HZ = 20;

type CharacterSave = {
  name: string;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  inventory: { itemId: string; qty: number }[];
};

type ClientData = {
  id: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  dx: number;
  dy: number;
  attack: boolean;
  gather: boolean;
  skill: boolean;
  attackCd: number;
  sessionXp: number;
  sessionItems: Map<string, number>;
  joinedAt: number;
};

type EnemyState = {
  id: string;
  defId: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  alive: boolean;
};

type NodeState = {
  id: string;
  defId: string;
  x: number;
  y: number;
  hp: number;
  depleted: boolean;
};

const enemies = enemiesData as Record<
  string,
  {
    hp: number;
    damage: number;
    speed: number;
    attackRange: number;
    xp: number;
    lootTable: string;
  }
>;
const nodes = nodesData as Record<
  string,
  { hp: number; drops: { itemId: string; qtyMin: number; qtyMax: number }[] }
>;
const tables = loottables as Record<
  string,
  {
    rolls: { itemId: string; chance: number; qtyMin: number; qtyMax: number }[];
  }
>;

const clients = new Map<ServerWebSocket<ClientData>, ClientData>();
let enemiesState: EnemyState[] = [];
let nodesState: NodeState[] = [];
let rewardSeq = 0;

function resetWorld(): void {
  const layout = generateHub(99);
  enemiesState = [];
  nodesState = [];
  let ei = 0;
  let ni = 0;
  for (const pack of layout.packs) {
    for (let i = 0; i < pack.count; i++) {
      const def = enemies[pack.enemyId] ?? enemies.shade;
      enemiesState.push({
        id: `e${ei++}`,
        defId: pack.enemyId,
        x: pack.x + (Math.random() - 0.5) * 2,
        y: pack.y + (Math.random() - 0.5) * 2,
        hp: def.hp,
        maxHp: def.hp,
        alive: true,
      });
    }
  }
  for (const n of layout.nodes) {
    const def = nodes[n.defId];
    nodesState.push({
      id: `n${ni++}`,
      defId: n.defId,
      x: n.x,
      y: n.y,
      hp: def?.hp ?? 30,
      depleted: false,
    });
  }
}

resetWorld();

function broadcast(obj: unknown): void {
  const data = JSON.stringify(obj);
  for (const ws of clients.keys()) {
    try {
      ws.send(data);
    } catch {
      /* ignore */
    }
  }
}

function rollLoot(tableId: string): { itemId: string; qty: number }[] {
  const table = tables[tableId];
  if (!table) return [];
  const out: { itemId: string; qty: number }[] = [];
  for (const roll of table.rolls) {
    if (Math.random() > roll.chance) continue;
    const qty =
      roll.qtyMin + Math.floor(Math.random() * (roll.qtyMax - roll.qtyMin + 1));
    if (qty > 0) out.push({ itemId: roll.itemId, qty });
  }
  return out;
}

function grantTo(
  client: ClientData,
  xp: number,
  items: { itemId: string; qty: number }[],
): void {
  client.sessionXp += xp;
  for (const it of items) {
    client.sessionItems.set(
      it.itemId,
      (client.sessionItems.get(it.itemId) ?? 0) + it.qty,
    );
  }
}

function tick(dt: number): void {
  for (const client of clients.values()) {
    const len = Math.hypot(client.dx, client.dy) || 1;
    if (client.dx || client.dy) {
      client.x += (client.dx / len) * 4.2 * dt;
      client.y += (client.dy / len) * 4.2 * dt;
      client.x = Math.min(23.5, Math.max(0.5, client.x));
      client.y = Math.min(23.5, Math.max(0.5, client.y));
    }
    client.attackCd = Math.max(0, client.attackCd - dt);

    if (client.attack && client.attackCd <= 0) {
      client.attackCd = 0.35;
      const dmg = 8 + Math.floor(client.name.length * 0.2);
      for (const enemy of enemiesState) {
        if (!enemy.alive) continue;
        const dist = Math.hypot(enemy.x - client.x, enemy.y - client.y);
        if (dist > 1.3) continue;
        enemy.hp -= dmg;
        if (enemy.hp <= 0) {
          enemy.alive = false;
          const def = enemies[enemy.defId] ?? enemies.shade;
          grantTo(client, def.xp, rollLoot(def.lootTable));
        }
      }
    }

    if (client.gather) {
      for (const node of nodesState) {
        if (node.depleted) continue;
        const dist = Math.hypot(node.x - client.x, node.y - client.y);
        if (dist > 1.4) continue;
        node.hp -= 10;
        if (node.hp <= 0) {
          node.depleted = true;
          const def = nodes[node.defId];
          if (def) {
            const drops: { itemId: string; qty: number }[] = [];
            for (const d of def.drops) {
              const qty =
                d.qtyMin +
                Math.floor(Math.random() * (d.qtyMax - d.qtyMin + 1));
              if (qty > 0) drops.push({ itemId: d.itemId, qty });
            }
            grantTo(client, 0, drops);
          }
        }
        break;
      }
    }

    client.attack = false;
    client.gather = false;
    client.skill = false;
  }

  // Simple chase AI toward nearest player
  for (const enemy of enemiesState) {
    if (!enemy.alive) continue;
    const def = enemies[enemy.defId] ?? enemies.shade;
    let nearest: ClientData | null = null;
    let best = Infinity;
    for (const c of clients.values()) {
      const d = Math.hypot(c.x - enemy.x, c.y - enemy.y);
      if (d < best) {
        best = d;
        nearest = c;
      }
    }
    if (!nearest || best > 6) continue;
    if (best < (def.attackRange ?? 1)) {
      nearest.hp = Math.max(0, nearest.hp - def.damage * dt * 0.5);
    } else {
      const dx = nearest.x - enemy.x;
      const dy = nearest.y - enemy.y;
      const len = Math.hypot(dx, dy) || 1;
      enemy.x += (dx / len) * def.speed * dt;
      enemy.y += (dy / len) * def.speed * dt;
    }
  }

  broadcast({
    type: 'state',
    players: [...clients.values()].map((c) => ({
      id: c.id,
      name: c.name,
      x: c.x,
      y: c.y,
      hp: c.hp,
      maxHp: c.maxHp,
    })),
    enemies: enemiesState,
    nodes: nodesState,
  });
}

function issueRewards(
  client: ClientData,
  ws: ServerWebSocket<ClientData>,
): void {
  rewardSeq += 1;
  const token = `sess_${Date.now()}_${rewardSeq}_${client.id}`;
  const items = [...client.sessionItems.entries()].map(([itemId, qty]) => ({
    itemId,
    qty,
  }));
  ws.send(
    JSON.stringify({
      type: 'session_rewards',
      token,
      xp: client.sessionXp,
      items,
    }),
  );
}

const websocketHandlers = {
  open(ws: ServerWebSocket<ClientData>) {
    if (clients.size >= MAX_PLAYERS) {
      ws.send(
        JSON.stringify({
          type: 'error',
          message: 'Session full (max 4)',
        }),
      );
      ws.close();
      return;
    }
    const id = crypto.randomUUID().slice(0, 8);
    ws.data.id = id;
    clients.set(ws, ws.data);
    ws.send(
      JSON.stringify({
        type: 'welcome',
        playerId: id,
        host: clients.size === 1,
      }),
    );
    console.log(`[riftborn] ${id} joined (${clients.size}/${MAX_PLAYERS})`);
  },
  message(ws: ServerWebSocket<ClientData>, message: string | Buffer) {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(String(message)) as Record<string, unknown>;
    } catch {
      return;
    }
    const client = clients.get(ws);
    if (!client) return;

    if (msg.type === 'join') {
      const character = msg.character as CharacterSave | undefined;
      if (character) {
        client.name = character.name || 'Wanderer';
        client.hp = character.hp;
        client.maxHp = character.maxHp;
      }
    }
    if (msg.type === 'input') {
      client.dx = Number(msg.dx) || 0;
      client.dy = Number(msg.dy) || 0;
      client.attack = Boolean(msg.attack);
      client.gather = Boolean(msg.gather);
      client.skill = Boolean(msg.skill);
    }
    if (msg.type === 'leave') {
      issueRewards(client, ws);
      clients.delete(ws);
      ws.close();
    }
  },
  close(ws: ServerWebSocket<ClientData>) {
    const client = clients.get(ws);
    if (client) {
      try {
        issueRewards(client, ws);
      } catch {
        /* socket may already be dead */
      }
      clients.delete(ws);
      console.log(
        `[riftborn] ${client.id} left (${clients.size}/${MAX_PLAYERS})`,
      );
    }
    if (clients.size === 0) resetWorld();
  },
};

function startServer(preferredPort: number) {
  const candidates = Array.from({ length: 12 }, (_, i) => preferredPort + i);
  let lastError: unknown;
  for (const port of candidates) {
    try {
      const server = Bun.serve<ClientData>({
        port,
        fetch(req, serverRef) {
          const ok = serverRef.upgrade(req, {
            data: {
              id: '',
              name: 'Guest',
              x: 8,
              y: 8,
              hp: 100,
              maxHp: 100,
              dx: 0,
              dy: 0,
              attack: false,
              gather: false,
              skill: false,
              attackCd: 0,
              sessionXp: 0,
              sessionItems: new Map(),
              joinedAt: Date.now(),
            },
          });
          if (ok) return undefined;
          return new Response(
            JSON.stringify({
              name: 'Riftborn co-op',
              ws: `ws://127.0.0.1:${port}`,
              maxPlayers: MAX_PLAYERS,
            }),
            { headers: { 'content-type': 'application/json' } },
          );
        },
        websocket: websocketHandlers,
      });

      const info = {
        port: server.port,
        ws: `ws://127.0.0.1:${server.port}`,
        updatedAt: new Date().toISOString(),
      };
      try {
        Bun.write('public/coop-port.json', JSON.stringify(info, null, 2));
      } catch {
        /* optional for clients */
      }
      console.log(`Riftborn co-op listening on ${info.ws}`);
      if (port !== preferredPort) {
        console.log(`(port ${preferredPort} was busy — using ${port} instead)`);
      }
      return server;
    } catch (err) {
      lastError = err;
    }
  }
  console.error('Failed to bind any co-op port', lastError);
  process.exit(1);
}

startServer(PORT);
setInterval(() => tick(1 / TICK_HZ), 1000 / TICK_HZ);
