import { Composite, Engine } from 'matter-js';
import { beforeEach, describe, expect, it } from 'vitest';

import { ALL_ATTACKS, attackAt, durationOf, windUpOf } from './attacks';
import { bossHpFor, createBossField } from './boss';
import {
  BEAM_WIDTH,
  BOSS_ALTITUDE,
  BOSS_SCALE_MAX,
  BOSS_SCALE_MIN,
  BOSS_STATS,
  PLAYER_START_INSET,
} from '../entities';
import { FIELD_HEIGHT, FIELD_WIDTH, isOutside } from '../field';
import type { BulletSpawn } from '../patterns';
import type { BossField, BossSnapshot } from './types';

/** Even power, and a player sitting in the middle of the field. */
const FULL_POWER = { power: 1, playerX: FIELD_WIDTH / 2 };

/** The patrol's vertical reach, restated — the module keeps it private. */
const PATROL_REACH_Y_CEILING = 100;

let engine: Engine;
let boss: BossField;

beforeEach(() => {
  engine = Engine.create({ gravity: { x: 0, y: 0 } });
  boss = createBossField(engine);
});

/** Run the boss for a stretch of seconds, collecting everything it fired. */
function run(seconds: number, step = 1 / 60) {
  const shots: BulletSpawn[] = [];
  let changes = 0;

  for (let elapsed = 0; elapsed < seconds; elapsed += step) {
    const advance = boss.advance(step, FULL_POWER);

    shots.push(...advance.shots);
    changes += advance.changed ? 1 : 0;
  }

  return { shots, changes };
}

/** Fly it in and stop the moment it is done entering. */
function land(): BossSnapshot {
  while (boss.snapshot()?.stance === 'entering') {
    boss.advance(1 / 60, FULL_POWER);
  }

  return boss.snapshot() as BossSnapshot;
}

/** The beam's body if one is out. */
function beamBody() {
  return boss.bodies().find((body) => body.label === 'enemy-beam');
}

/** Run until the boss is firing the given attack, or give up. */
function runUntilFiring(attack: string): boolean {
  for (let step = 0; step < 6000; step += 1) {
    const seen = boss.snapshot();

    if (seen?.stance === 'firing' && seen.attack === attack) {
      return true;
    }

    boss.advance(1 / 60, FULL_POWER);
  }

  return false;
}

describe('bossHpFor', () => {
  it('is the base pool in round one', () => {
    expect(bossHpFor(1, 1)).toBe(BOSS_STATS.hp);
  });

  it('grows every round', () => {
    expect(bossHpFor(4, 1)).toBeGreaterThan(bossHpFor(3, 1));
    expect(bossHpFor(3, 1)).toBeGreaterThan(bossHpFor(2, 1));
  });

  // Round 0 is not reachable, but the clamp is what stops a caller's off-by-one
  // handing the boss less health than the base pool.
  it('never falls below the base pool', () => {
    expect(bossHpFor(0, 1)).toBe(BOSS_STATS.hp);
  });
});

describe('summon', () => {
  it('starts with no boss at all', () => {
    expect(boss.present()).toBe(false);
    expect(boss.snapshot()).toBeNull();
    expect(boss.bodies()).toEqual([]);
    expect(boss.records()).toEqual([]);
  });

  it('puts one body in the physics world', () => {
    boss.summon(1, 1);

    expect(boss.present()).toBe(true);
    expect(boss.bodies()).toHaveLength(1);
    expect(Composite.allBodies(engine.world)).toHaveLength(1);
  });

  it('gives it the round’s hit points', () => {
    boss.summon(5, 1);

    expect(boss.snapshot()?.maxHp).toBe(bossHpFor(5, 1));
    expect(boss.snapshot()?.hp).toBe(bossHpFor(5, 1));
  });

  // The frame asks every pass of every frame; the second one must not restart
  // the fight or add a second body.
  it('is a no-op the second time', () => {
    boss.summon(1, 1);

    const first = boss.snapshot()?.id;

    boss.summon(9, 1);

    expect(boss.snapshot()?.id).toBe(first);
    expect(boss.snapshot()?.maxHp).toBe(bossHpFor(1, 1));
    expect(boss.bodies()).toHaveLength(1);
  });

  it('reports itself as a boss on the roster', () => {
    boss.summon(1, 1);

    expect(boss.records()).toEqual([{ id: boss.snapshot()?.id, kind: 'boss' }]);
  });
});

describe('advance · with no boss', () => {
  it('does nothing and fires nothing', () => {
    expect(run(2).shots).toEqual([]);
    expect(run(2).changes).toBe(0);
  });
});

describe('advance · entering', () => {
  beforeEach(() => {
    boss.summon(1, 1);
  });

  it('names no attack while it is still on its way in', () => {
    expect(boss.snapshot()?.stance).toBe('entering');
    expect(boss.snapshot()?.attack).toBeUndefined();
  });

  it('fires nothing on the way in', () => {
    const { shots } = run(0.3);

    expect(boss.snapshot()?.stance).toBe('entering');
    expect(shots).toEqual([]);
  });

  /*
   * Shielded while it arrives.
   *
   * It used to descend slowly, unable to move or fire, and be shot the whole way
   * — at full loadout power that was half its health before the fight started.
   * Reported from play as being handed a free target. Damage is discarded rather
   * than banked: what cannot fight back should not be losing either.
   */
  it('takes no damage while it arrives', () => {
    expect(boss.damage(500)).toBeNull();
    expect(boss.snapshot()?.hp).toBe(bossHpFor(1, 1));
    expect(boss.snapshot()?.stance).toBe('entering');
  });

  it('starts taking damage the moment it is on station', () => {
    land();

    expect(boss.damage(100)).toBeNull();
    expect(boss.snapshot()?.hp).toBe(bossHpFor(1, 1) - 100);
  });

  // Quick, because an entrance is a cue rather than a phase of the fight — and
  // the shield above means there is nothing to gain by shooting through it.
  it('arrives in well under a second', () => {
    run(1);

    expect(boss.snapshot()?.stance).not.toBe('entering');
  });

  it('stops descending when it reaches its altitude', () => {
    land();

    const settled = boss.bodies()[0].position;

    expect(settled.y).toBeGreaterThanOrEqual(BOSS_ALTITUDE);
    expect(settled.y).toBeLessThan(BOSS_ALTITUDE + 10);
  });

  it('winds up as soon as it arrives', () => {
    expect(land().stance).toBe('winding');
  });

  /*
   * No jump where the descent hands over to the patrol.
   *
   * It shipped with one: the patrol read `sin` of an age that had been running
   * for the whole flight in, so the boss finished its entrance dead centre and
   * then teleported 143 units right on its first patrolling frame. Reported from
   * play — and the reason it took play to find it is that every other assertion
   * here looks at one frame at a time, where a teleport is invisible.
   *
   * The ceiling is the honest one: 1.5 units of descent per frame plus at most
   * 1.5 of patrol, so anything past 4 is a discontinuity rather than motion.
   */
  /*
   * Split by whether a ram is in flight, because the two have very different honest
   * speeds and one ceiling for both would be too loose to catch anything.
   *
   * Cruising, the fastest legitimate motion is the flight in at 7 units a frame plus
   * about 2 of patrol. A dive is an order of magnitude quicker by design — it now
   * reaches the bottom of the field in 1.3s — so it gets its own, wider bound.
   *
   * Both are still far below a teleport, which is what this exists for: the boss has
   * shipped two of them, and neither was visible from a single frame.
   */
  it('never jumps between one frame and the next', () => {
    let previous = { ...boss.bodies()[0].position };
    let cruising = 0;
    let diving = 0;

    for (let step = 0; step < 1800; step += 1) {
      // Read before advancing: the jump belongs to the stance the boss was *in*,
      // not the one the step moved it to.
      const seen = boss.snapshot();

      boss.advance(1 / 60, FULL_POWER);

      const at = boss.bodies()[0].position;
      const jump = Math.hypot(at.x - previous.x, at.y - previous.y);

      if (seen?.attack === 'ram' && seen.stance === 'firing') {
        diving = Math.max(diving, jump);
      } else {
        cruising = Math.max(cruising, jump);
      }

      previous = { ...at };
    }

    expect(cruising).toBeLessThan(10);
    expect(diving).toBeLessThan(48);
  });

  /*
   * Within a unit of centre, not exactly on it. Arrival is detected on the frame
   * that crosses the altitude rather than at the instant it is reached, so the
   * patrol's phase starts a fraction of a frame late — half a unit of drift,
   * which is a third of a pixel on screen. Asserting exact equality here would
   * be asserting that time is continuous.
   */
  it('starts its patrol from the centre it descended through', () => {
    land();

    expect(Math.abs(boss.bodies()[0].position.x - FIELD_WIDTH / 2)).toBeLessThan(2);
  });
});

describe('advance · patrolling', () => {
  beforeEach(() => {
    boss.summon(1, 1);
    land();
  });

  // It has no path from `../paths` precisely because every one of those must
  // eventually leave the field, and this must never leave it.
  it('never leaves the field, however long the fight runs', () => {
    for (let step = 0; step < 3600; step += 1) {
      boss.advance(1 / 60, FULL_POWER);

      const { x, y } = boss.bodies()[0].position;

      expect(isOutside(x, y, BOSS_STATS.radius)).toBe(false);
    }
  });

  it('moves to both sides of centre', () => {
    const seen: number[] = [];

    for (let step = 0; step < 1200; step += 1) {
      boss.advance(1 / 60, FULL_POWER);
      seen.push(boss.bodies()[0].position.x);
    }

    expect(Math.max(...seen)).toBeGreaterThan(FIELD_WIDTH / 2 + 50);
    expect(Math.min(...seen)).toBeLessThan(FIELD_WIDTH / 2 - 50);
  });
});

describe('advance · the tell', () => {
  beforeEach(() => {
    boss.summon(1, 1);
    land();
  });

  it('fires nothing during the wind-up', () => {
    const attack = boss.snapshot()?.attack as string;
    const { shots } = run(windUpOf(attack as never) - 1 / 30);

    expect(boss.snapshot()?.stance).toBe('winding');
    expect(shots).toEqual([]);
  });

  // The first volley is never held back for a cadence. Otherwise the tell ends
  // and nothing happens for up to half a second, which reads as a lie.
  it('fires on the very frame the wind-up ends', () => {
    const attack = attackAt(1, 0);

    while (boss.snapshot()?.stance === 'winding') {
      boss.advance(1 / 60, FULL_POWER);
    }

    expect(boss.snapshot()?.stance).toBe('firing');
    expect(boss.advance(1 / 60, FULL_POWER).shots.length).toBeGreaterThan(0);
    expect(attack).not.toBe('beam');
  });

  it('announces what it is about to do, so the tell carries information', () => {
    const winding = boss.snapshot() as BossSnapshot;

    expect(winding.stance).toBe('winding');
    expect(winding.attack).toBe(attackAt(1, 0));
  });
});

describe('advance · firing bullets', () => {
  beforeEach(() => {
    boss.summon(1, 1);
    land();
  });

  it('fires downward, as an enemy, with the round’s power on it', () => {
    const { shots } = run(4);
    const first = shots[0];

    expect(shots.length).toBeGreaterThan(0);
    expect(first.side).toBe('enemy');
    expect(first.vy).toBeGreaterThan(0);
    expect(first.damage).toBe(BOSS_STATS.damage);
  });

  it('scales its damage with the round’s power boost', () => {
    boss.advance(1 / 60, { power: 2, playerX: FIELD_WIDTH / 2 });

    const shots: BulletSpawn[] = [];

    for (let step = 0; step < 600; step += 1) {
      shots.push(...boss.advance(1 / 60, { power: 2, playerX: FIELD_WIDTH / 2 }).shots);
    }

    expect(shots[0].damage).toBe(BOSS_STATS.damage * 2);
  });

  it('throws several volleys within one attack', () => {
    const { shots } = run(8);

    expect(shots.length).toBeGreaterThan(4);
  });

  it('works through more than one attack, resting between them', () => {
    const stances = new Set<string>();

    for (let step = 0; step < 1200; step += 1) {
      boss.advance(1 / 60, FULL_POWER);
      stances.add(boss.snapshot()?.stance as string);
    }

    expect(stances).toContain('winding');
    expect(stances).toContain('firing');
    expect(stances).toContain('recovering');
  });

  it('reaches every attack it has, given a long enough fight', () => {
    const seen = new Set<string>();

    for (let step = 0; step < 9000; step += 1) {
      boss.advance(1 / 60, FULL_POWER);

      const now = boss.snapshot();

      if (now?.stance === 'firing' && now.attack) {
        seen.add(now.attack);
      }
    }

    expect(seen).toContain('beam');
    expect(seen).toContain('ram');
    expect(seen.size).toBe(ALL_ATTACKS.length);
  });
});

describe('advance · the beam', () => {
  beforeEach(() => {
    boss.summon(1, 1);
    land();
  });

  it('puts a body on the field only while it is firing', () => {
    expect(beamBody()).toBeUndefined();
    expect(runUntilFiring('beam')).toBe(true);

    boss.advance(1 / 60, FULL_POWER);

    expect(beamBody()).toBeDefined();
  });

  it('is as wide as it is declared, and reaches past the bottom edge', () => {
    runUntilFiring('beam');
    boss.advance(1 / 60, FULL_POWER);

    const beam = beamBody() as NonNullable<ReturnType<typeof beamBody>>;
    const { min, max } = beam.bounds;

    expect(Math.round(max.x - min.x)).toBe(BEAM_WIDTH);
    expect(max.y).toBeGreaterThan(FIELD_HEIGHT);
  });

  // A column the player can be caught by has to be where the boss is, or the
  // tell points at the wrong place.
  it('tracks the boss while it patrols', () => {
    runUntilFiring('beam');
    boss.advance(1 / 60, FULL_POWER);

    for (let step = 0; step < 20; step += 1) {
      boss.advance(1 / 60, FULL_POWER);

      const beam = beamBody();

      if (beam) {
        expect(beam.position.x).toBeCloseTo(boss.bodies()[0].position.x, 5);
      }
    }
  });

  it('fires no bullets — it is the attack', () => {
    runUntilFiring('beam');

    const shots: BulletSpawn[] = [];

    for (let step = 0; step < Math.ceil(durationOf('beam') * 60); step += 1) {
      shots.push(...boss.advance(1 / 60, FULL_POWER).shots);
    }

    expect(shots).toEqual([]);
  });

  it('is gone once the attack is over', () => {
    runUntilFiring('beam');

    for (let step = 0; step < Math.ceil((durationOf('beam') + 0.2) * 60); step += 1) {
      boss.advance(1 / 60, FULL_POWER);
    }

    expect(beamBody()).toBeUndefined();
    expect(Composite.allBodies(engine.world)).toHaveLength(1);
  });

  it('appears on the roster, so React draws it', () => {
    runUntilFiring('beam');
    boss.advance(1 / 60, FULL_POWER);

    expect(boss.records().map(({ kind }) => kind)).toEqual(['boss', 'beam']);
  });

  it('announces the beam before it exists', () => {
    for (let step = 0; step < 6000; step += 1) {
      const now = boss.snapshot();

      if (now?.stance === 'winding' && now.attack === 'beam') {
        expect(beamBody()).toBeUndefined();

        return;
      }

      boss.advance(1 / 60, FULL_POWER);
    }

    throw new Error('the boss never wound up a beam');
  });
});

describe('damage', () => {
  it('is nobody’s business when there is no boss', () => {
    expect(boss.damage(100)).toBeNull();
    expect(boss.owns(1)).toBe(false);
  });

  it('subtracts hit points without killing', () => {
    boss.summon(1, 1);
    land();

    expect(boss.damage(50)).toBeNull();
    expect(boss.snapshot()?.hp).toBe(bossHpFor(1, 1) - 50);
  });

  it('owns its own body and nothing else', () => {
    boss.summon(1, 1);

    const id = boss.snapshot()?.id as number;

    expect(boss.owns(id)).toBe(true);
    expect(boss.owns(id + 1)).toBe(false);
  });

  it('returns the wreck where it fell, and leaves the field', () => {
    boss.summon(1, 1);
    land();

    const at = { ...boss.bodies()[0].position };
    const wreck = boss.damage(bossHpFor(1, 1));

    expect(wreck?.x).toBeCloseTo(at.x, 5);
    expect(wreck?.y).toBeCloseTo(at.y, 5);
    expect(boss.present()).toBe(false);
    expect(boss.snapshot()).toBeNull();
    expect(Composite.allBodies(engine.world)).toEqual([]);
  });

  // The killing shot takes the pool negative, and the bar is published from the
  // same frame that reports the death.
  it('never publishes a negative bar', () => {
    boss.summon(1, 1);
    land();
    boss.damage(bossHpFor(1, 1) - 1);

    expect(boss.snapshot()?.hp).toBe(1);

    boss.damage(500);

    expect(boss.snapshot()).toBeNull();
  });

  it('takes the beam with it when it dies mid-attack', () => {
    boss.summon(1, 1);
    land();
    runUntilFiring('beam');
    boss.advance(1 / 60, FULL_POWER);

    expect(beamBody()).toBeDefined();

    boss.damage(bossHpFor(1, 1));

    expect(Composite.allBodies(engine.world)).toEqual([]);
  });

  it('stops owning its id the moment it dies', () => {
    boss.summon(1, 1);
    land();

    const id = boss.snapshot()?.id as number;

    boss.damage(bossHpFor(1, 1));

    expect(boss.owns(id)).toBe(false);
  });
});

describe('clear', () => {
  it('removes the boss and its beam', () => {
    boss.summon(1, 1);
    land();
    runUntilFiring('beam');
    boss.advance(1 / 60, FULL_POWER);
    boss.clear();

    expect(boss.present()).toBe(false);
    expect(boss.bodies()).toEqual([]);
    expect(Composite.allBodies(engine.world)).toEqual([]);
  });

  it('is safe with no boss on the field', () => {
    expect(() => boss.clear()).not.toThrow();
  });

  it('lets the next round summon a fresh one', () => {
    boss.summon(1, 1);
    boss.clear();
    boss.summon(3, 1);

    expect(boss.snapshot()?.maxHp).toBe(bossHpFor(3, 1));
  });
});

describe('advance · the ram', () => {
  /** Run until the boss is in a given stance of a given attack. */
  function runUntil(stance: string, attack: string, playerX = FIELD_WIDTH / 2): boolean {
    for (let step = 0; step < 9000; step += 1) {
      const seen = boss.snapshot();

      if (seen?.stance === stance && seen.attack === attack) {
        return true;
      }

      boss.advance(1 / 60, { power: 1, playerX });
    }

    return false;
  }

  beforeEach(() => {
    boss.summon(1, 1);
    land();
  });

  it('is reached, and fires no bullets — the boss is the projectile', () => {
    expect(runUntil('firing', 'ram')).toBe(true);

    const shots = [];

    for (let step = 0; step < Math.ceil(durationOf('ram') * 60); step += 1) {
      shots.push(...boss.advance(1 / 60, FULL_POWER).shots);
    }

    expect(shots).toEqual([]);
  });

  // The tell is a recoil: the boss pulls *back* before it commits, which is the
  // opposite motion to the attack and so cannot be mistaken for one.
  it('pulls back during the wind-up, before diving', () => {
    expect(runUntil('winding', 'ram')).toBe(true);

    const start = boss.bodies()[0].position.y;

    for (let step = 0; step < 30; step += 1) {
      boss.advance(1 / 60, FULL_POWER);
    }

    expect(boss.bodies()[0].position.y).toBeLessThan(start);
  });

  it('dives far down the field, then comes back up', () => {
    expect(runUntil('firing', 'ram')).toBe(true);

    const seen = [];

    for (let step = 0; step < Math.ceil((durationOf('ram') + 0.2) * 60); step += 1) {
      boss.advance(1 / 60, FULL_POWER);
      seen.push(boss.bodies()[0].position.y);
    }

    expect(Math.max(...seen)).toBeGreaterThan(FIELD_HEIGHT / 2);
    expect(seen.at(-1)).toBeLessThan(FIELD_HEIGHT / 3);
  });

  /*
   * Locked at the end of the tell, not tracked through the dive.
   *
   * A ram that followed the player would be unavoidable, and then the one-second
   * wind-up would be decoration. Locking at the last instant the player could
   * still have moved is what makes moving the answer.
   */
  it('commits to the column the player was in when the tell ended', () => {
    expect(runUntil('winding', 'ram', 120)).toBe(true);

    // Still winding: fly the rest of the tell out with the player on the left.
    while (boss.snapshot()?.stance === 'winding') {
      boss.advance(1 / 60, { power: 1, playerX: 120 });
    }

    // Now the player runs to the far side. The dive must not follow.
    const seen = [];

    while (boss.snapshot()?.stance === 'firing') {
      boss.advance(1 / 60, { power: 1, playerX: 460 });
      seen.push(boss.bodies()[0].position.x);
    }

    expect(Math.min(...seen)).toBeLessThan(FIELD_WIDTH / 2);
    expect(Math.max(...seen)).toBeLessThan(440);
  });

  it('is back on its patrol once the dive is over', () => {
    expect(runUntil('firing', 'ram', 120)).toBe(true);

    while (boss.snapshot()?.stance === 'firing') {
      boss.advance(1 / 60, { power: 1, playerX: 120 });
    }

    // Two frames of recovery: the offset is gone, so this is the patrol alone.
    boss.advance(1 / 60, FULL_POWER);

    const { x, y } = boss.bodies()[0].position;

    expect(y).toBeLessThan(BOSS_ALTITUDE + PATROL_REACH_Y_CEILING);
    expect(isOutside(x, y, BOSS_STATS.radius)).toBe(false);
  });

  // The one craft in the game with no exit. A ram that carried it out through the
  // bottom would be a boss that killed itself.
  it('never leaves the field, ram included', () => {
    for (let step = 0; step < 5400; step += 1) {
      boss.advance(1 / 60, { power: 1, playerX: step % 2 === 0 ? 40 : 500 });

      const { x, y } = boss.bodies()[0].position;

      expect(isOutside(x, y, BOSS_STATS.radius)).toBe(false);
    }
  });
});

describe('summon · the rolled body size', () => {
  it('takes the size it is given', () => {
    boss.summon(1, 1.8);

    expect(boss.bodies()[0].circleRadius).toBeCloseTo(BOSS_STATS.radius * 1.8, 5);
  });

  it('rolls one inside the declared range when none is given', () => {
    // Twenty rolls: enough that a broken range shows up, few enough to stay fast.
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const rolled = createBossField(Engine.create({ gravity: { x: 0, y: 0 } }));

      rolled.summon(1);

      const radius = rolled.bodies()[0].circleRadius as number;

      expect(radius).toBeGreaterThanOrEqual(BOSS_STATS.radius * BOSS_SCALE_MIN);
      expect(radius).toBeLessThanOrEqual(BOSS_STATS.radius * BOSS_SCALE_MAX);
    }
  });

  // The trade, in both directions: neither size is simply the easier fight.
  it('moves a small one faster than a large one', () => {
    const small = createBossField(Engine.create({ gravity: { x: 0, y: 0 } }));
    const large = createBossField(Engine.create({ gravity: { x: 0, y: 0 } }));

    small.summon(1, BOSS_SCALE_MIN);
    large.summon(1, BOSS_SCALE_MAX);

    for (const one of [small, large]) {
      while (one.snapshot()?.stance === 'entering') {
        one.advance(1 / 60, FULL_POWER);
      }
    }

    const spanOf = (one: BossField): number => {
      const seen: number[] = [];

      for (let step = 0; step < 300; step += 1) {
        one.advance(1 / 60, FULL_POWER);
        seen.push(one.bodies()[0].position.x);
      }

      return Math.max(...seen) - Math.min(...seen);
    };

    expect(spanOf(small)).toBeGreaterThan(spanOf(large));
  });

  it('fires more from a large one than a small one', () => {
    const shotsFrom = (scale: number): number => {
      const one = createBossField(Engine.create({ gravity: { x: 0, y: 0 } }));

      one.summon(1, scale);

      let shots = 0;

      for (let step = 0; step < 1800; step += 1) {
        shots += one.advance(1 / 60, FULL_POWER).shots.length;
      }

      return shots;
    };

    expect(shotsFrom(BOSS_SCALE_MAX)).toBeGreaterThan(shotsFrom(BOSS_SCALE_MIN));
  });
});

describe('advance · the ram reaches the bottom', () => {
  /*
   * It used to bottom out around 55% of the field, which left a band along the
   * bottom edge where standing still was safe — reported as space left for someone
   * to hide in. The dive is measured to a floor now, so it arrives at the same row
   * whatever the patrol was doing.
   */
  it('carries the boss past the player station', () => {
    boss.summon(1, 1);
    land();

    let deepest = 0;

    for (let step = 0; step < 9000; step += 1) {
      boss.advance(1 / 60, { power: 1, playerX: FIELD_WIDTH / 2 });
      deepest = Math.max(deepest, boss.bodies()[0].position.y);
    }

    expect(deepest).toBeGreaterThan(FIELD_HEIGHT - PLAYER_START_INSET);
  });

  it('keeps its centre on the field even at the bottom of a dive', () => {
    boss.summon(1, BOSS_SCALE_MAX);
    land();

    for (let step = 0; step < 9000; step += 1) {
      boss.advance(1 / 60, { power: 1, playerX: step % 2 === 0 ? 40 : 500 });

      const { x, y } = boss.bodies()[0].position;

      expect(isOutside(x, y, 0)).toBe(false);
    }
  });
});

describe('advance · where the shots leave from', () => {
  /** Run until a named attack is firing, collecting that volley. */
  function volleyOf(attack: string, scale: number) {
    const one = createBossField(Engine.create({ gravity: { x: 0, y: 0 } }));

    one.summon(1, scale);

    for (let step = 0; step < 9000; step += 1) {
      const seen = one.snapshot();

      if (seen?.stance === 'firing' && seen.attack === attack) {
        const { shots } = one.advance(1 / 60, FULL_POWER);

        if (shots.length > 0) {
          return { shots, at: { ...one.bodies()[0].position } };
        }
      }

      one.advance(1 / 60, FULL_POWER);
    }

    throw new Error(`never fired ${attack}`);
  }

  /*
   * A radial burst leaves the centre, not the nose.
   *
   * Reported from play at a rolled size of 2: a ring fired from the muzzle has its
   * centre hanging 132 units below the aircraft, which reads as a ring belonging to
   * nothing. A burst is the aircraft coming apart in every direction.
   */
  it.each([1, BOSS_SCALE_MAX])('fires a radial from the centre at scale %s', (scale) => {
    const { shots, at } = volleyOf('radial', scale);

    for (const shot of shots) {
      expect(shot.y).toBeCloseTo(at.y, 0);
      expect(shot.x).toBeCloseTo(at.x, 0);
    }
  });

  it.each([1, BOSS_SCALE_MAX])('fires aimed shots from the nose at scale %s', (scale) => {
    const { shots, at } = volleyOf('straight', scale);

    for (const shot of shots) {
      expect(shot.y).toBeGreaterThan(at.y);
    }
  });

  // The muzzle answers to the drawing, so it has to grow with it — at scale 1 the
  // old `radius + 8` looked right and at scale 2 it was 20 units inside the body.
  it('puts the muzzle further out on a larger body', () => {
    const small = volleyOf('straight', 1);
    const large = volleyOf('straight', BOSS_SCALE_MAX);

    expect(large.shots[0].y - large.at.y)
      .toBeGreaterThan((small.shots[0].y - small.at.y) * 1.5);
  });
});

describe('bossHpFor · size', () => {
  /*
   * The correction. It was first left out on the guess that a larger body is an
   * easier target — but the cannons are 26 units apart and the smallest hit circle
   * is 41 in radius, so both trails connect at every size. Hit *rate* does not move
   * with size; time on target does, because a large boss patrols slower.
   */
  it('gives a larger body more hit points', () => {
    expect(bossHpFor(1, BOSS_SCALE_MAX)).toBeGreaterThan(bossHpFor(1, BOSS_SCALE_MIN));
  });

  it('scales linearly, so the size is readable off the bar', () => {
    expect(bossHpFor(1, 2)).toBe(bossHpFor(1, 1) * 2);
  });

  it('still grows with the round at any size', () => {
    for (const scale of [BOSS_SCALE_MIN, 1, BOSS_SCALE_MAX]) {
      expect(bossHpFor(5, scale)).toBeGreaterThan(bossHpFor(4, scale));
    }
  });

  it('gives the summoned boss the pool for its own size', () => {
    boss.summon(3, BOSS_SCALE_MAX);

    expect(boss.snapshot()?.maxHp).toBe(bossHpFor(3, BOSS_SCALE_MAX));
  });
});
