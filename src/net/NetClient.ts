import type { CharacterSave } from '../types/save';
import { gameState } from '../systems/GameState';
import { settingsStore } from '../core/SettingsStore';
import { DEFAULT_COOP_WS, normalizeCoopHostUrl } from '../systems/CoopGate';

export type NetMessage =
  | { type: 'welcome'; playerId: string; host: boolean }
  | {
      type: 'state';
      players: NetPlayer[];
      /** Legacy — server no longer sends these (I4). */
      enemies?: NetEnemy[];
      nodes?: NetNode[];
    }
  | { type: 'chat'; from: string; text: string }
  | {
      type: 'session_rewards';
      token: string;
      xp: number;
      items: { itemId: string; qty: number }[];
    }
  | { type: 'error'; message: string }
  | { type: 'host_ended' };

export type NetPlayer = {
  id: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
};

export type NetEnemy = {
  id: string;
  defId: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  alive: boolean;
};

export type NetNode = {
  id: string;
  defId: string;
  x: number;
  y: number;
  hp: number;
  depleted: boolean;
};

type Listener = (msg: NetMessage) => void;

/**
 * Thin WebSocket client for self-hosted co-op.
 * Resolve order: `__RIFTBORN_WS__` → settings `coopHostUrl` →
 * `/coop-port.json` → `DEFAULT_COOP_WS`.
 */
export class NetClient {
  private ws: WebSocket | null = null;
  private readonly listeners = new Set<Listener>();
  playerId: string | null = null;
  connected = false;

  onMessage(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  async resolveUrl(fallback = DEFAULT_COOP_WS): Promise<string> {
    const injected = (window as unknown as { __RIFTBORN_WS__?: string })
      .__RIFTBORN_WS__;
    if (injected) return injected;
    const saved = normalizeCoopHostUrl(settingsStore.get().coopHostUrl);
    if (saved) return saved;
    try {
      const res = await fetch('/coop-port.json', { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as { ws?: string };
        if (data.ws) return data.ws;
      }
    } catch {
      /* ignore */
    }
    return fallback;
  }

  connect(url?: string): void {
    if (this.ws) this.disconnect();
    const start = (resolved: string) => {
      this.ws = new WebSocket(resolved);
      this.bindSocket();
    };
    if (url) {
      start(url);
      return;
    }
    void this.resolveUrl().then(start);
  }

  private bindSocket(): void {
    if (!this.ws) return;
    const ws = this.ws;
    ws.addEventListener('open', () => {
      this.connected = true;
      this.send({
        type: 'join',
        character: gameState.toSave(),
      });
    });
    ws.addEventListener('message', (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as NetMessage;
        if (msg.type === 'welcome') this.playerId = msg.playerId;
        if (msg.type === 'session_rewards') {
          gameState.applySessionRewards(msg);
        }
        for (const fn of this.listeners) fn(msg);
      } catch {
        /* ignore malformed */
      }
    });
    ws.addEventListener('close', () => {
      this.connected = false;
      this.playerId = null;
    });
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
    this.connected = false;
  }

  send(payload: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(payload));
  }

  sendInput(input: {
    dx: number;
    dy: number;
    attack: boolean;
    gather: boolean;
    skill: boolean;
  }): void {
    this.send({ type: 'input', ...input });
  }

  requestLeave(): void {
    this.send({
      type: 'leave',
      character: gameState.toSave() as CharacterSave,
    });
  }
}

export const netClient = new NetClient();
