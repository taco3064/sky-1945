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
      phase: vi.fn(() => 'waves' as const),
      isDrained: vi.fn(() => false),
      beginBoss: vi.fn(),
      nextRound: vi.fn(),
    },
    boss: {
      summon: vi.fn(),
      owns: vi.fn(() => false),
      damage: vi.fn(() => null),
      advance: vi.fn(() => ({ changed: false, shots: [] })),
      bodies: vi.fn(() => []),
      records: vi.fn(() => []),
      snapshot: vi.fn(() => null),
      present: vi.fn(() => false),
      clear: vi.fn(),
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
      bossChanged: false,
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
          edge: 'top' as const,
          entry: { x: 100, y: -40 },
        }]),
      },
    });

    stepFrame(parts, 1 / 60);

    expect(parts.enemies.spawn).toHaveBeenCalledWith({
      kind: 'small',
      path: 'dive',
      edge: 'top',
      entry: { x: 100, y: -40 },
    });
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

describe('stepFrame · the end of the waves', () => {
  it('waits for the field to clear, not just for the last wave', () => {
    const parts = stubParts();

    parts.director.isDrained = vi.fn(() => true);
    parts.enemies.count = vi.fn(() => 2);

    stepFrame(parts, 1 / 60);

    expect(parts.director.beginBoss).not.toHaveBeenCalled();
    expect(parts.boss.summon).not.toHaveBeenCalled();
  });

  // The whole point of the phase: clearing the waves no longer clears the
  // round. It summons the thing the round is actually about.
  it('summons the boss once both are true, and does not advance the round', () => {
    const parts = stubParts();

    parts.director.isDrained = vi.fn(() => true);
    parts.enemies.count = vi.fn(() => 0);

    const result = stepFrame(parts, 1 / 60);

    expect(parts.director.beginBoss).toHaveBeenCalled();
    expect(parts.boss.summon).toHaveBeenCalledWith(1);
    expect(result.roundAdvanced).toBe(false);
    expect(result.bossChanged).toBe(true);
    expect(parts.director.nextRound).not.toHaveBeenCalled();
  });

  it('summons it for the round it is in, so its hit points and attacks match', () => {
    const parts = stubParts();

    parts.director.isDrained = vi.fn(() => true);
    parts.enemies.count = vi.fn(() => 0);
    parts.director.round = vi.fn(() => 6);

    stepFrame(parts, 1 / 60);

    expect(parts.boss.summon).toHaveBeenCalledWith(6);
  });
});

describe('stepFrame · the end of a round', () => {
  it('holds the round while the boss is alive', () => {
    const parts = stubParts();

    parts.director.phase = vi.fn(() => 'boss' as const);
    parts.boss.present = vi.fn(() => true);

    expect(stepFrame(parts, 1 / 60).roundAdvanced).toBe(false);
    expect(parts.director.nextRound).not.toHaveBeenCalled();
  });

  it('advances when the boss is gone', () => {
    const parts = stubParts();

    parts.director.phase = vi.fn(() => 'boss' as const);
    parts.boss.present = vi.fn(() => false);

    const result = stepFrame(parts, 1 / 60);

    expect(result.roundAdvanced).toBe(true);
    expect(parts.director.nextRound).toHaveBeenCalled();
    // The bar has to be told it is gone, or an empty frame stays on screen.
    expect(result.bossChanged).toBe(true);
  });

  // The field being clear is not the signal during the boss phase — it is clear
  // on the frame between the last mob dying and the boss arriving too.
  it('does not re-summon the boss during the boss phase', () => {
    const parts = stubParts();

    parts.director.phase = vi.fn(() => 'boss' as const);
    parts.boss.present = vi.fn(() => true);
    parts.director.isDrained = vi.fn(() => true);
    parts.enemies.count = vi.fn(() => 0);

    stepFrame(parts, 1 / 60);

    expect(parts.boss.summon).not.toHaveBeenCalled();
  });
});

describe('stepFrame · boss damage', () => {
  const bossHit = [{
    kind: 'enemy-damaged' as const,
    enemyId: 77,
    bulletId: 5,
    damage: 30,
  }];

  it('sends damage to the boss when the id is its own, not to the mobs', () => {
    const parts = stubParts(bossHit);

    parts.boss.owns = vi.fn((id) => id === 77);

    const result = stepFrame(parts, 1 / 60);

    expect(parts.boss.damage).toHaveBeenCalledWith(30);
    expect(parts.enemies.damage).not.toHaveBeenCalled();
    expect(result.bossChanged).toBe(true);
  });

  it('sends it to the mobs when it is not', () => {
    const parts = stubParts(bossHit);

    parts.boss.owns = vi.fn(() => false);

    const result = stepFrame(parts, 1 / 60);

    expect(parts.enemies.damage).toHaveBeenCalledWith(77, 30);
    expect(parts.boss.damage).not.toHaveBeenCalled();
    expect(result.bossChanged).toBe(false);
  });

  // `owns` is asked before the damage lands, because the boss stops owning its
  // own id the instant it dies — asked afterwards, its death would look like a
  // hit on something that was never the boss, and the bar would never clear.
  it('reports the boss changed even on the shot that kills it', () => {
    const parts = stubParts(bossHit);

    parts.boss.owns = vi.fn((id) => id === 77);
    parts.boss.damage = vi.fn(() => ({ x: 270, y: 150 }));

    const result = stepFrame(parts, 1 / 60);

    expect(result.bossChanged).toBe(true);

    expect(parts.effects.burst).toHaveBeenCalledWith(
      { x: 270, y: 150 },
      { size: 'large', tone: 'enemy' },
    );
  });

  it('carries the boss volleys into the bullet field', () => {
    const parts = stubParts();
    const shot = { x: 1, y: 2, vx: 0, vy: 90, damage: 14, side: 'enemy' as const };

    parts.boss.advance = vi.fn(() => ({ changed: false, shots: [shot] }));

    stepFrame(parts, 1 / 60);

    expect(parts.bullets.add).toHaveBeenCalledWith(expect.arrayContaining([shot]));
  });
});
