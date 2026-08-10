import { describe, expect, it } from 'vitest';

import {
  PLAYER_BASE_SPEED,
  PLAYER_BOUNDS_INSET,
  PLAYER_HIT_RADIUS,
  PLAYER_START_INSET,
  createPlayer,
} from './entities';

describe('createPlayer', () => {
  it('lands where it is put', () => {
    const player = createPlayer(120, 400);

    expect(player.position.x).toBe(120);
    expect(player.position.y).toBe(400);
  });

  // Sensor mode is the whole premise: Matter reports contact and integrates
  // motion, and nothing in a bullet-hell game bounces off anything.
  it('is a sensor with no air friction', () => {
    const player = createPlayer(0, 0);

    expect(player.isSensor).toBe(true);
    expect(player.frictionAir).toBe(0);
  });

  it('is labelled, so collision handlers can tell it apart (#6)', () => {
    expect(createPlayer(0, 0).label).toBe('player');
  });
});

describe('the player is a dot, not an aircraft', () => {
  // The sprite is 44 units wide (see the craft spec). The hit circle is a
  // fraction of that on purpose — contact is fatal in #6, and a hitbox
  // matching the drawing makes the game unplayable.
  //
  // The sprite's size is a CSS number in components/Fighter and cannot be
  // imported here: `components` is not an allowed importer of `engine`. So
  // this asserts the property that matters — the hit radius is a small
  // absolute number — rather than a ratio it has no way to compute.
  it('has a hit radius far under half a sprite width', () => {
    expect(PLAYER_HIT_RADIUS).toBeLessThan(6);
  });

  it('may approach the edge by about half a sprite, so no wing is clipped', () => {
    expect(PLAYER_BOUNDS_INSET).toBeGreaterThan(PLAYER_HIT_RADIUS);
  });

  it('starts clear of the bottom edge', () => {
    expect(PLAYER_START_INSET).toBeGreaterThan(PLAYER_BOUNDS_INSET);
  });

  it('crosses the field in a sensible number of seconds at 100%', () => {
    const secondsAcross = 540 / PLAYER_BASE_SPEED;

    expect(secondsAcross).toBeGreaterThan(1);
    expect(secondsAcross).toBeLessThan(3);
  });
});
