import { Engine } from 'matter-js';
import { describe, expect, it, vi } from 'vitest';

import { stepFrame } from './frame';
import type { FrameParts } from './frame';
import type { Hit } from '../collisions';

/**
 * Frame is tested against stubs rather than the real fields.
 *
 * What it owns is the *order* things happen in and how contacts turn into
 * consequences — and both are far easier to pin down when the collision list
 * is something a test hands over rather than something it has to arrange by
 * flying an aircraft into a bullet.
 */
function stubParts(hits: Hit[] = [], overrides: Partial<FrameParts> = {}): FrameParts {
  return {
    engine: Engine.create({ gravity: { x: 0, y: 0 } }),
    pilot: {
      id: 1,
      body: { position: { x: 0, y: 0 } } as FrameParts['pilot']['body'],
      point: vi.fn(),
      advance: vi.fn(() => []),
      roll: vi.fn(() => true),
      snapshot: vi.fn(() => ({ rolling: false, invulnerable: false })),
      isVulnerable: vi.fn(() => true),
      kill: vi.fn(() => ({ x: 100, y: 200 })),
    },
    bullets: {
      add: vi.fn(() => false),
      advance: vi.fn(() => false),
      bodies: vi.fn(() => []),
      records: vi.fn(() => []),
      remove: vi.fn(),
      clear: vi.fn(),
    },
    enemies: {
      spawn: vi.fn(),
      damage: vi.fn(() => null),
      advance: vi.fn(() => ({ changed: false, shots: [] })),
      bodies: vi.fn(() => []),
      records: vi.fn(() => []),
      count: vi.fn(() => 1),
      clear: vi.fn(),
    },
    effects: {
      burst: vi.fn(),
      advance: vi.fn(() => false),
      records: vi.fn(() => []),
      placements: vi.fn(() => []),
      clear: vi.fn(),
    },
    collisions: {
      // Like the real one: the buffer empties, so later passes in the same
      // frame see nothing.
      drain: vi.fn().mockReturnValueOnce(hits).mockReturnValue([]),
      dispose: vi.fn(),
    },
    director: {
      advance: vi.fn(() => []),
      round: vi.fn(() => 1),
      isDrained: vi.fn(() => false),
      nextRound: vi.fn(),
    },
    ...overrides,
  };
}

describe('stepFrame · a quiet frame', () => {
  it('reports nothing changed when nothing happened', () => {
    expect(stepFrame(stubParts(), 1 / 60)).toEqual({
      rosterChanged: false,
      playerDied: false,
      roundAdvanced: false,
    });
  });

  it('moves everyone and carries what they fired', () => {
    const parts = stubParts();

    stepFrame(parts, 1 / 60);

    expect(parts.pilot.advance).toHaveBeenCalled();
    expect(parts.enemies.advance).toHaveBeenCalled();
    expect(parts.bullets.add).toHaveBeenCalled();
    expect(parts.bullets.advance).toHaveBeenCalled();
    expect(parts.effects.advance).toHaveBeenCalled();
  });

  // A frame is resolved in several collision passes, and the split must not
  // change how much time anything thinks has gone by — otherwise every cadence
  // and the whole difficulty curve drifts.
  it('hands out exactly the elapsed time it was given, however it splits it', () => {
    const parts = stubParts();

    stepFrame(parts, 1 / 60);

    const dealt = vi.mocked(parts.pilot.advance).mock.calls
      .reduce((total, [slice]) => total + slice, 0);

    expect(dealt).toBeCloseTo(1 / 60, 12);
    expect(vi.mocked(parts.pilot.advance).mock.calls.length).toBeGreaterThan(1);
  });

  it('puts everyone the director sends onto the field', () => {
    const parts = stubParts([], {
      director: {
        ...stubParts().director,
        advance: vi.fn(() => [{
          kind: 'small' as const,
          path: 'dive' as const,
          entry: { x: 100, y: -40 },
        }]),
      },
    });

    stepFrame(parts, 1 / 60);

    expect(parts.enemies.spawn).toHaveBeenCalledWith('small', 'dive', { x: 100, y: -40 });
  });
});

describe('stepFrame · a bullet finding an enemy', () => {
  const shot: Hit = { kind: 'enemy-damaged', enemyId: 9, bulletId: 4, damage: 25 };

  it('spends the bullet and subtracts the damage', () => {
    const parts = stubParts([shot]);
    const result = stepFrame(parts, 1 / 60);

    expect(parts.bullets.remove).toHaveBeenCalledWith(4);
    expect(parts.enemies.damage).toHaveBeenCalledWith(9, 25);
    expect(result.rosterChanged).toBe(true);
  });

  it('leaves no burst behind when the enemy survives', () => {
    const parts = stubParts([shot]);

    stepFrame(parts, 1 / 60);

    expect(parts.effects.burst).not.toHaveBeenCalled();
  });

  it('bursts where the wreck was when it does not', () => {
    const parts = stubParts([shot]);

    parts.enemies.damage = vi.fn(() => ({ x: 300, y: 400 }));
    stepFrame(parts, 1 / 60);

    expect(parts.effects.burst).toHaveBeenCalledWith(
      { x: 300, y: 400 },
      { size: 'small', tone: 'enemy' },
    );
  });
});

describe('stepFrame · contact with the player', () => {
  const contact: Hit = { kind: 'player-hit' };

  it('kills, bursts, and says so', () => {
    const parts = stubParts([contact]);
    const result = stepFrame(parts, 1 / 60);

    expect(parts.pilot.kill).toHaveBeenCalled();

    expect(parts.effects.burst).toHaveBeenCalledWith(
      { x: 100, y: 200 },
      { size: 'large', tone: 'ally' },
    );

    expect(result.playerDied).toBe(true);
  });

  // Whether a contact happened and whether it matters are different questions,
  // which is why invulnerability is checked here and not in the watch.
  it('ignores contact while protected', () => {
    const parts = stubParts([contact]);

    parts.pilot.isVulnerable = vi.fn(() => false);

    const result = stepFrame(parts, 1 / 60);

    expect(parts.pilot.kill).not.toHaveBeenCalled();
    expect(result.playerDied).toBe(false);
  });

  // Flying into a wall of bullets registers many contacts on one frame. Each
  // must not cost a separate life.
  it('costs one life however many things were touched at once', () => {
    const parts = stubParts([contact, contact, contact]);

    stepFrame(parts, 1 / 60);

    expect(parts.pilot.kill).toHaveBeenCalledTimes(1);
    expect(parts.effects.burst).toHaveBeenCalledTimes(1);
  });

  // The passes within a frame are exactly where a death could double-count,
  // which is why kill() grants the protection itself.
  it('does not die twice inside one frame', () => {
    const parts = stubParts([contact]);

    parts.collisions.drain = vi.fn(() => [contact]);

    parts.pilot.isVulnerable = vi.fn()
      .mockReturnValueOnce(true)
      .mockReturnValue(false);

    stepFrame(parts, 1 / 60);

    expect(parts.pilot.kill).toHaveBeenCalledTimes(1);
  });
});

describe('stepFrame · the end of a round', () => {
  it('waits for the field to clear, not just for the last wave', () => {
    const parts = stubParts();

    parts.director.isDrained = vi.fn(() => true);
    parts.enemies.count = vi.fn(() => 2);

    expect(stepFrame(parts, 1 / 60).roundAdvanced).toBe(false);
    expect(parts.director.nextRound).not.toHaveBeenCalled();
  });

  it('advances once both are true', () => {
    const parts = stubParts();

    parts.director.isDrained = vi.fn(() => true);
    parts.enemies.count = vi.fn(() => 0);

    expect(stepFrame(parts, 1 / 60).roundAdvanced).toBe(true);
    expect(parts.director.nextRound).toHaveBeenCalled();
  });
});
