import { describe, expect, test } from 'bun:test';
import {
  INTERACT_RANGE,
  resolveInteractAction,
  type InteractCandidate,
} from './InteractResolve';

const origin = { x: 10, y: 10 };

describe('resolveInteractAction', () => {
  test('none when empty or everything out of range', () => {
    expect(resolveInteractAction(origin, []).kind).toBe('none');
    expect(
      resolveInteractAction(origin, [
        { kind: 'loot', x: 10 + INTERACT_RANGE.loot + 0.2, y: 10 },
        { kind: 'npc', x: 10, y: 10 + INTERACT_RANGE.npc + 0.2 },
      ]).kind,
    ).toBe('none');
  });

  test('loot beats nearer npc / portal / chest', () => {
    const candidates: InteractCandidate[] = [
      { kind: 'npc', x: 10.3, y: 10, id: 'mira' },
      { kind: 'portal', x: 10.4, y: 10, id: 'rift' },
      { kind: 'chest', x: 10.2, y: 10, id: 'c1' },
      { kind: 'loot', x: 11.2, y: 10, id: 'drop' },
    ];
    const r = resolveInteractAction(origin, candidates);
    expect(r.kind).toBe('loot');
    expect(r.label).toBe('Loot');
    expect(r.dimmed).toBe(false);
  });

  test('among interact tier, nearest wins (npc vs portal vs chest)', () => {
    const r = resolveInteractAction(origin, [
      { kind: 'portal', x: 11.5, y: 10, id: 'rift' },
      { kind: 'chest', x: 10.8, y: 10, id: 'c1' },
      { kind: 'npc', x: 11.2, y: 10, npcRole: 'vendor', id: 'mira' },
    ]);
    expect(r.kind).toBe('chest');
    expect(r.label).toBe('Open');
  });

  test('npc / portal labels', () => {
    expect(
      resolveInteractAction(origin, [
        { kind: 'npc', x: 10.5, y: 10, npcRole: 'trader' },
      ]).label,
    ).toBe('Talk');
    expect(
      resolveInteractAction(origin, [
        { kind: 'portal', x: 10.5, y: 10, portalExit: false },
      ]).label,
    ).toBe('Rift');
    expect(
      resolveInteractAction(origin, [
        { kind: 'portal', x: 10.5, y: 10, portalExit: true },
      ]).label,
    ).toBe('Exit');
  });

  test('interact tier beats shrine / bench / gather', () => {
    const r = resolveInteractAction(origin, [
      { kind: 'gather', x: 10.1, y: 10, id: 'ore' },
      { kind: 'shrine', x: 10.2, y: 10 },
      { kind: 'bench', x: 10.15, y: 10 },
      { kind: 'npc', x: 11.5, y: 10, npcRole: 'board', id: 'board' },
    ]);
    expect(r.kind).toBe('npc');
    expect(r.label).toBe('Talk');
  });

  test('range edges: inside yes, outside no', () => {
    const inside = resolveInteractAction(origin, [
      { kind: 'loot', x: 10 + INTERACT_RANGE.loot - 0.01, y: 10 },
    ]);
    expect(inside.kind).toBe('loot');
    const outside = resolveInteractAction(origin, [
      { kind: 'loot', x: 10 + INTERACT_RANGE.loot + 0.01, y: 10 },
    ]);
    expect(outside.kind).toBe('none');
    expect(outside.dimmed).toBe(true);
    expect(outside.label).toBe('E');
  });

  test('gatherRange override', () => {
    const far = resolveInteractAction(
      origin,
      [{ kind: 'gather', x: 11.5, y: 10 }],
      { gatherRange: 1.0 },
    );
    expect(far.kind).toBe('none');
    const near = resolveInteractAction(
      origin,
      [{ kind: 'gather', x: 11.5, y: 10 }],
      { gatherRange: 2.0 },
    );
    expect(near.kind).toBe('gather');
    expect(near.label).toBe('Mine');
  });
});
