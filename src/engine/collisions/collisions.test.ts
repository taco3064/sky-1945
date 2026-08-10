import { Body, Composite, Engine } from 'matter-js';
import { beforeEach, describe, expect, it } from 'vitest';

import { createCollisionWatch } from './collisions';
import type { CollisionWatch } from './collisions';
import {
  createBeam,
  createBoss,
  createBullet,
  createEnemy,
  createPlayer,
} from '../entities';

let engine: Engine;
let watch: CollisionWatch;

beforeEach(() => {
  engine = Engine.create({ gravity: { x: 0, y: 0 } });
  watch = createCollisionWatch(engine);
});

/** Step the engine the way the frame does — one 60Hz tick. */
function tick(): void {
  Engine.update(engine, 1000 / 60);
}

function playerBullet(x: number, y: number) {
  return createBullet({ x, y, vx: 0, vy: -600, damage: 25, side: 'player' });
}

describe('collisions · Matter reports overlapping sensors at all', () => {
  // The foundational assumption of the whole engine: every body is a sensor,
  // every position is written with setPosition rather than integrated, and
  // Matter is expected to report the contact anyway. If this fails, nothing
  // above it can work.
  it('reports two sensors placed on top of each other', () => {
    const player = createPlayer(270, 500);
    const enemy = createEnemy('small', 270, 500);

    Composite.add(engine.world, [player, enemy]);
    tick();

    expect(watch.drain()).toEqual([{ kind: 'player-hit' }]);
  });

  it('reports a contact that arrives by setPosition, not by velocity', () => {
    const player = createPlayer(270, 500);
    const enemy = createEnemy('small', 270, 200);

    Composite.add(engine.world, [player, enemy]);
    tick();

    expect(watch.drain()).toHaveLength(0);

    Body.setPosition(enemy, { x: 270, y: 500 });
    tick();

    expect(watch.drain()).toEqual([{ kind: 'player-hit' }]);
  });

  it('reports nothing while they are apart', () => {
    Composite.add(engine.world, [createPlayer(100, 500), createEnemy('small', 400, 500)]);
    tick();

    expect(watch.drain()).toHaveLength(0);
  });
});

describe('collisions · a bullet finding an enemy', () => {
  it('reports the enemy, the bullet, and the damage', () => {
    const enemy = createEnemy('small', 270, 300);
    const bullet = playerBullet(270, 300);

    Composite.add(engine.world, [enemy, bullet]);
    tick();

    expect(watch.drain()).toEqual([{
      kind: 'enemy-damaged',
      enemyId: enemy.id,
      bulletId: bullet.id,
      damage: 25,
    }]);
  });

  // Matter hands back an unordered pair, so the classification cannot depend
  // on which body it happens to call A.
  it('reports the same thing whichever order the pair arrives in', () => {
    const enemy = createEnemy('medium', 270, 300);

    Composite.add(engine.world, [playerBullet(270, 300), enemy]);
    tick();

    const [hit] = watch.drain();

    expect(hit).toMatchObject({ kind: 'enemy-damaged', enemyId: enemy.id });
  });

  it('ignores a player bullet meeting the player', () => {
    Composite.add(engine.world, [createPlayer(270, 300), playerBullet(270, 300)]);
    tick();

    expect(watch.drain()).toHaveLength(0);
  });
});

describe('collisions · what kills the player', () => {
  it('counts an enemy bullet', () => {
    const shot = createBullet({
      x: 270, y: 500, vx: 0, vy: 260, damage: 8, side: 'enemy',
    });

    Composite.add(engine.world, [createPlayer(270, 500), shot]);
    tick();

    expect(watch.drain()).toEqual([{ kind: 'player-hit' }]);
  });

  it.each(['small', 'medium', 'large'] as const)('counts a %s enemy', (kind) => {
    Composite.add(engine.world, [createPlayer(270, 500), createEnemy(kind, 270, 500)]);
    tick();

    expect(watch.drain()).toEqual([{ kind: 'player-hit' }]);
  });

  it('ignores two enemies touching each other', () => {
    Composite.add(engine.world, [
      createEnemy('small', 270, 500),
      createEnemy('medium', 270, 500),
    ]);

    tick();

    expect(watch.drain()).toHaveLength(0);
  });
});

describe('collisions · draining', () => {
  it('empties the buffer, so a contact is acted on once', () => {
    Composite.add(engine.world, [createPlayer(270, 500), createEnemy('small', 270, 500)]);
    tick();

    expect(watch.drain()).toHaveLength(1);
    expect(watch.drain()).toHaveLength(0);
  });

  it('stops listening after dispose', () => {
    watch.dispose();
    Composite.add(engine.world, [createPlayer(270, 500), createEnemy('small', 270, 500)]);
    tick();

    expect(watch.drain()).toHaveLength(0);
  });
});

describe('collisions · the enemy side is one rule', () => {
  /*
   * Contact with anything on the enemy side is fatal, and the label prefix is
   * the whole test. It replaced a list of "an enemy, or an enemy's bullet",
   * which would have needed a new entry the moment the boss's beam arrived —
   * and the failure mode of forgetting is a hazard the player can fly through.
   */
  it('kills the player on contact with the boss', () => {
    Composite.add(engine.world, [createPlayer(270, 150), createBoss(270, 150)]);
    tick();

    expect(watch.drain()).toEqual([{ kind: 'player-hit' }]);
  });

  it('kills the player on contact with the beam', () => {
    Composite.add(engine.world, [createPlayer(270, 600), createBeam(270, 200)]);
    tick();

    expect(watch.drain()).toEqual([{ kind: 'player-hit' }]);
  });
});

describe('collisions · what can be shot', () => {
  it('reports damage on the boss, which has hit points of its own', () => {
    const boss = createBoss(270, 150);

    Composite.add(engine.world, [playerBullet(270, 150), boss]);
    tick();

    expect(watch.drain()).toEqual([{
      kind: 'enemy-damaged',
      enemyId: boss.id,
      bulletId: expect.any(Number),
      damage: 25,
    }]);
  });

  /*
   * The beam is a hazard, not a target. Without it excluded, the player's own
   * fire would be swallowed by the very column it is trying to shoot past —
   * and every shot would report damage against a body that owns no hit points,
   * so the frame would delete a bullet for nothing.
   */
  it('reports nothing when a player bullet meets the beam', () => {
    Composite.add(engine.world, [playerBullet(270, 400), createBeam(270, 150)]);
    tick();

    expect(watch.drain()).toEqual([]);
  });
});
