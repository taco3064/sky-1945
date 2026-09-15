import { describe, expect, it } from 'vitest';
import {
  addCircle,
  addRectangle,
  createCollisions,
  detectContacts,
  moveBody,
  removeBody,
} from './collisions';

const PASS = 1 / 240;

describe('bodies', () => {
  it('are zero-gravity sensors without air friction, shaped per game-spec 12.11', () => {
    const collisions = createCollisions<string>();

    const circle = (id: number, owner: string, radius: number, angle?: number) =>
      addCircle(collisions, { id, owner, x: 0, y: 0, radius, angle });

    circle(1, 'player', 3);
    circle(2, 'bullet', 4);
    circle(3, 'small', 13, 180);
    circle(4, 'medium', 20, 180);
    circle(5, 'large', 32, 180);
    circle(6, 'boss', 104, 180);

    addRectangle(collisions, {
      id: 7,
      owner: 'beam',
      x: 0,
      y: 0,
      width: 88,
      height: 1000,
    });

    expect(collisions.engine.gravity).toMatchObject({ x: 0, y: 0 });
    const bodies = [...collisions.bodies.values()];

    expect(bodies.every((body) => body.isSensor && body.frictionAir === 0)).toBe(true);

    expect(bodies.map((body) => body.vertices.length))
      .toEqual([10, 10, 14, 20, 26, 26, 4]);

    expect(bodies.map((body) => body.angle))
      .toEqual([0, 0, Math.PI, Math.PI, Math.PI, Math.PI, 0]);

    const beam = collisions.bodies.get(7);

    expect([beam?.bounds.max.x, beam?.bounds.max.y]).toEqual([44, 500]);
  });
});

describe('contacts', () => {
  it('reports a pair once per overlap, when the overlap begins', () => {
    const collisions = createCollisions<string>();

    addCircle(collisions, { id: 1, owner: 'player', x: 100, y: 100, radius: 3 });
    addCircle(collisions, { id: 2, owner: 'bullet', x: 200, y: 100, radius: 4 });

    expect(detectContacts(collisions, PASS)).toEqual([]);

    moveBody(collisions, 2, { x: 104, y: 100 });

    expect(detectContacts(collisions, PASS).map((pair) => [...pair].sort()))
      .toEqual([['bullet', 'player']]);

    expect(detectContacts(collisions, PASS)).toEqual([]);

    moveBody(collisions, 2, { x: 200, y: 100 });
    expect(detectContacts(collisions, PASS)).toEqual([]);
    moveBody(collisions, 2, { x: 102, y: 100 });
    expect(detectContacts(collisions, PASS).length).toBe(1);
  });

  it('keeps bodies where they are placed', () => {
    const collisions = createCollisions<string>();

    addCircle(collisions, {
      id: 1,
      owner: 'enemy',
      x: 50,
      y: 60,
      radius: 13,
      angle: 180,
    });

    moveBody(collisions, 1, { x: 70, y: 80 });
    moveBody(collisions, 1, { x: 70, y: 80 });
    detectContacts(collisions, PASS);
    detectContacts(collisions, 0);

    expect(collisions.bodies.get(1)?.position).toEqual({ x: 70, y: 80 });
  });

  it('reports nothing for removed bodies, and ignores unknown ids', () => {
    const collisions = createCollisions<string>();

    addCircle(collisions, { id: 1, owner: 'player', x: 100, y: 100, radius: 3 });
    addCircle(collisions, { id: 2, owner: 'enemy', x: 300, y: 100, radius: 13 });

    removeBody(collisions, 2);
    removeBody(collisions, 2);
    moveBody(collisions, 2, { x: 100, y: 100 });

    const { bodies, owners, engine } = collisions;

    expect(detectContacts(collisions, PASS)).toEqual([]);
    expect([bodies.size, owners.size, engine.world.bodies.length]).toEqual([1, 1, 1]);
  });
});
