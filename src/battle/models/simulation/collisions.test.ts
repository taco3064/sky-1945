import { describe, expect, it } from 'vitest';
import { addCircle, addRectangle, createCollisions, detectContacts, moveBody, removeBody } from './collisions';

const PASS = 1 / 240;

describe('bodies', () => {
  it('are zero-gravity sensors without air friction, shaped per game-spec 12.11', () => {
    const collisions = createCollisions<string>();

    addCircle(collisions, 1, 'player', 270, 800, 3);
    addCircle(collisions, 2, 'bullet', 0, 0, 4);
    addCircle(collisions, 3, 'small', 0, 0, 13, 180);
    addCircle(collisions, 4, 'medium', 0, 0, 20, 180);
    addCircle(collisions, 5, 'large', 0, 0, 32, 180);
    addCircle(collisions, 6, 'boss', 0, 0, 104, 180);
    addRectangle(collisions, 7, 'beam', 0, 0, 88, 1000);

    expect(collisions.engine.gravity).toMatchObject({ x: 0, y: 0 });
    const bodies = [...collisions.bodies.values()];

    expect(bodies.every((body) => body.isSensor && body.frictionAir === 0)).toBe(true);
    expect(bodies.map((body) => body.vertices.length)).toEqual([10, 10, 14, 20, 26, 26, 4]);
    expect(bodies.map((body) => body.angle)).toEqual([0, 0, Math.PI, Math.PI, Math.PI, Math.PI, 0]);
    const beam = collisions.bodies.get(7);

    expect([beam?.bounds.max.x, beam?.bounds.max.y]).toEqual([44, 500]);
  });
});

describe('contacts', () => {
  it('reports a pair once, on the pass its overlap begins, until it separates and touches again', () => {
    const collisions = createCollisions<string>();

    addCircle(collisions, 1, 'player', 100, 100, 3);
    addCircle(collisions, 2, 'bullet', 200, 100, 4);

    expect(detectContacts(collisions, PASS)).toEqual([]);

    moveBody(collisions, 2, 104, 100);
    expect(detectContacts(collisions, PASS).map((pair) => [...pair].sort())).toEqual([['bullet', 'player']]);
    expect(detectContacts(collisions, PASS)).toEqual([]);

    moveBody(collisions, 2, 200, 100);
    expect(detectContacts(collisions, PASS)).toEqual([]);
    moveBody(collisions, 2, 102, 100);
    expect(detectContacts(collisions, PASS).length).toBe(1);
  });

  it('keeps bodies where they are placed', () => {
    const collisions = createCollisions<string>();

    addCircle(collisions, 1, 'enemy', 50, 60, 13, 180);

    moveBody(collisions, 1, 70, 80);
    moveBody(collisions, 1, 70, 80);
    detectContacts(collisions, PASS);
    detectContacts(collisions, 0);

    expect(collisions.bodies.get(1)?.position).toEqual({ x: 70, y: 80 });
  });

  it('reports nothing for removed bodies, and ignores unknown ids', () => {
    const collisions = createCollisions<string>();

    addCircle(collisions, 1, 'player', 100, 100, 3);
    addCircle(collisions, 2, 'enemy', 300, 100, 13);

    removeBody(collisions, 2);
    removeBody(collisions, 2);
    moveBody(collisions, 2, 100, 100);

    expect(detectContacts(collisions, PASS)).toEqual([]);
    expect([collisions.bodies.size, collisions.owners.size, collisions.engine.world.bodies.length]).toEqual([1, 1, 1]);
  });
});
