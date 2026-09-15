import { expect, it } from 'vitest';
import { BULLET_EXIT_MARGIN, BULLET_HIT_RADIUS, createBullet, hasBulletLeft, moveBullet } from './bullet';

it('has a 4 u hit radius and leaves 24 u past the field', () => {
  expect(BULLET_HIT_RADIUS).toBe(4);
  expect(BULLET_EXIT_MARGIN).toBe(24);
});

it('takes its velocity from heading and speed', () => {
  const bullet = createBullet(7, { side: 'player', x: 257, y: 774, heading: -90, speed: 780, damage: 11.25 });

  expect(bullet).toMatchObject({ id: 7, side: 'player', x: 257, y: 774, damage: 11.25 });
  expect(bullet.vx).toBeCloseTo(0, 9);
  expect(bullet.vy).toBeCloseTo(-780, 9);
});

it('moves at constant velocity', () => {
  const bullet = createBullet(1, { side: 'enemy', x: 100, y: 100, heading: 0, speed: 320, damage: 14 });

  moveBullet(bullet, 0.5);
  moveBullet(bullet, 0.25);

  expect(bullet.x).toBeCloseTo(340, 9);
  expect(bullet.y).toBeCloseTo(100, 9);
});

it('has left once outside by more than 24 u', () => {
  const bullet = createBullet(1, { side: 'player', x: 270, y: -24, heading: -90, speed: 780, damage: 7.5 });

  expect(hasBulletLeft(bullet)).toBe(false);

  moveBullet(bullet, 0.001);

  expect(hasBulletLeft(bullet)).toBe(true);
});
