import { describe, expect, it } from 'vitest';
import {
  ENEMY_KINDS,
  type EnemyKind,
  enemyBulletDamage,
  enemyBulletSpeed,
  enemyFireInterval,
  enemyMoveSpeed,
} from './kinds';

it('matches the game-spec 12.8 table', () => {
  expect(ENEMY_KINDS).toEqual({
    small: {
      hp: 20, radius: 13, speed: 165, damage: 8, interval: 1.1, pattern: 'straight',
    },
    medium: {
      hp: 60, radius: 20, speed: 115, damage: 10, interval: 1.6, pattern: 'spread',
    },
    large: {
      hp: 160, radius: 32, speed: 72, damage: 12, interval: 2.2, pattern: 'radial',
    },
  });
});

// game-spec 14.2: m, then move / fire every / bullet / dmg for S, M, L
type Stats = [number, number, number, number];
type Row = [number, Stats, Stats, Stats];

const ROUNDS: Row[] = [
  [1.0, [165, 1.1, 260, 8], [115, 1.6, 260, 10], [72, 2.2, 260, 12]],
  [1.1, [181.5, 1.0, 272.25, 8.8], [126.5, 1.45, 260, 11], [79.2, 2.0, 260, 13.2]],
  [1.2, [198, 0.92, 297, 9.6], [138, 1.33, 260, 12], [86.4, 1.83, 260, 14.4]],
  [1.3, [214.5, 0.85, 321.75, 10.4], [149.5, 1.23, 260, 13], [93.6, 1.69, 260, 15.6]],
  [1.4, [231, 0.79, 346.5, 11.2], [161, 1.14, 260, 14], [100.8, 1.57, 260, 16.8]],
  [1.5, [247.5, 0.73, 371.25, 12], [172.5, 1.07, 260, 15], [108, 1.47, 260, 18]],
  [1.6, [264, 0.69, 396, 12.8], [184, 1.0, 276, 16], [115.2, 1.38, 260, 19.2]],
  [1.7, [280.5, 0.65, 420.75, 13.6], [195.5, 0.94, 293.25, 17], [122.4, 1.29, 260, 20.4]],
  [1.8, [297, 0.61, 445.5, 14.4], [207, 0.89, 310.5, 18], [129.6, 1.22, 260, 21.6]],
  [1.9, [313.5, 0.58, 470.25, 15.2], [218.5, 0.84, 327.75, 19], [136.8, 1.16, 260, 22.8]],
  [2.0, [330, 0.55, 495, 16], [230, 0.8, 345, 20], [144, 1.1, 260, 24]],
];

describe.each(ROUNDS)('with m = %f', (m, small, medium, large) => {
  it.each<[EnemyKind, Stats]>([
    ['small', small],
    ['medium', medium],
    ['large', large],
  ])('%s craft follow game-spec 14.2', (kind, [move, fireEvery, bullet, damage]) => {
    expect(enemyMoveSpeed(kind, m)).toBeCloseTo(move, 9);
    // The table rounds fire intervals to two decimals.
    expect(enemyFireInterval(kind, m)).toBeCloseTo(fireEvery, 2);
    expect(enemyBulletSpeed(kind, m)).toBeCloseTo(bullet, 9);
    expect(enemyBulletDamage(kind, m)).toBeCloseTo(damage, 9);
  });
});
