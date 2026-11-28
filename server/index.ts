/**
 * Riftborn self-hosted co-op server (max 4 players).
 * Authoritative player positions + session reward writeback tokens.
 * Hub layout seed matches the client (`generateHub(42)`).
 *
 * Run: bun run server
 * Client: Pause → Co-op (or P) — paste LAN URL if not on the host machine.
 */

import type { ServerWebSocket } from 'bun';
import { clampHubCoord, generateHub, HUB_SPAWN } from '../src/world/MapGen';
import { advertiseWs } from './lanHosts';

/** Must match WorldScene hub seed so layout stays aligned. */
const HUB_SEED = 42;

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

const clients = new Map<ServerWebSocket<ClientData>, ClientData>();
let rewardSeq = 0;

function resetWorld(): void {
  // Align with client hub; packs/nodes stay local-only (I4 — no unused broadcast).
  generateHub(HUB_SEED);
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

function tick(dt: number): void {
  for (const client of clients.values()) {
    const len = Math.hypot(client.dx, client.dy) || 1;
    if (client.dx || client.dy) {
      client.x += (client.dx / len) * 4.2 * dt;
      client.y += (client.dy / len) * 4.2 * dt;
      client.x = clampHubCoord(client.x);
      client.y = clampHubCoord(client.y);
    }
    client.attackCd = Math.max(0, client.attackCd - dt);
    // Attack / gather stay local on each client — hub co-op syncs ghosts only.
    client.attack = false;
    client.gather = false;
    client.skill = false;
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
  });
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
              x: HUB_SPAWN.x,
              y: HUB_SPAWN.y,
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
          const { ws, lan } = advertiseWs(port);
          return new Response(
            JSON.stringify({
              name: 'Riftborn co-op',
              ws,
              lan,
              maxPlayers: MAX_PLAYERS,
            }),
            { headers: { 'content-type': 'application/json' } },
          );
        },
        websocket: websocketHandlers,
      });

      const { ws, lan } = advertiseWs(server.port);
      const info = {
        port: server.port,
        ws,
        lan,
        updatedAt: new Date().toISOString(),
      };
      try {
        Bun.write('public/coop-port.json', JSON.stringify(info, null, 2));
      } catch {
        /* optional for clients */
      }
      console.log(`Riftborn co-op listening on ${ws}`);
      console.log(`  loopback: ws://127.0.0.1:${server.port}`);
      for (const url of info.lan) {
        console.log(`  LAN:      ${url}`);
      }
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
