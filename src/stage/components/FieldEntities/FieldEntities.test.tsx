import { render } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { BattleView } from '~app/battle/models/simulation';
import { FieldEntities } from './FieldEntities';

const VIEW: BattleView = {
  lives: 3,
  round: 1,
  gameOver: false,
  player: { id: 1, rolling: true, protected: true, spent: true },
  bullets: [
    { id: 7, side: 'player' },
    { id: 5, side: 'enemy' },
  ],
  enemies: [{ id: 3, kind: 'medium' }],
  boss: { id: 4, size: 1.5, hp: 900, maxHp: 1350, pose: 'winding', move: 'beam' },
  beam: { id: 8 },
  bursts: [{ id: 9, tone: 'enemy', size: 'small' }],
  fps: 0,
  worst: 0,
};

it('paints the player, bullets, enemies, boss, beam and bursts in that order', () => {
  const { container } = render(
    <div data-testid="field">
      <FieldEntities view={VIEW} register={vi.fn()} />
    </div>,
  );

  const field = container.firstElementChild as HTMLElement;

  expect([...field.children].map((entity) => entity.className)).toEqual([
    'ally ally--protected ally--rolling ally--spent',
    'bullet bullet--player',
    'bullet bullet--enemy',
    'enemy enemy--medium',
    'boss',
    'beam',
    'burst burst--enemy burst--small',
  ]);

  const { dataset, style } = container.querySelector('.boss') as HTMLElement;

  expect([dataset.pose, dataset.move, style.getPropertyValue('--boss-scale')])
    .toEqual(['winding', 'beam', '1.5']);
});

it('registers every outer element under its entity id', () => {
  const register = vi.fn();
  const { container } = render(<FieldEntities view={VIEW} register={register} />);

  const registered = new Map(register.mock.calls.map(([id, element]) => [id, element]));

  expect([...registered.keys()].sort((a, b) => a - b)).toEqual([1, 3, 4, 5, 7, 8, 9]);
  expect(registered.get(1)).toBe(container.querySelector('.ally'));
  expect(registered.get(8)).toBe(container.querySelector('.beam'));
});

it('keeps unchanged entities registered and unregisters removed ones', () => {
  const register = vi.fn();
  const { rerender } = render(<FieldEntities view={VIEW} register={register} />);

  register.mockClear();

  const remaining = { ...VIEW, bullets: [VIEW.bullets[1]], boss: null, beam: null };

  rerender(<FieldEntities view={remaining} register={register} />);

  expect(register.mock.calls.map(([id, element]) => [id, element])).toEqual(
    expect.arrayContaining([
      [7, null],
      [4, null],
      [8, null],
    ]),
  );

  expect(register.mock.calls.length).toBe(3);
});
