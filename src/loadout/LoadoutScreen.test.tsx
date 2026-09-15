import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { LoadoutScreen } from './LoadoutScreen';

function setup(speedPoints: number) {
  const onSpeedPointsChange = vi.fn();
  const onStart = vi.fn();

  const view = render(
    <LoadoutScreen
      speedPoints={speedPoints}
      onSpeedPointsChange={onSpeedPointsChange}
      onStart={onStart}
    />,
  );

  return { onSpeedPointsChange, onStart, ...view };
}

it('lays out the loadout children in spec order', () => {
  const { container } = setup(5);

  const loadout = container.firstElementChild as HTMLElement;
  const children = [...loadout.children].map((child) => child.className);

  expect(children).toEqual([
    'loadout__heading',
    'loadout__rule',
    'loadout__stats',
    'loadout__slider-row',
    'loadout__controls',
    'loadout__start',
  ]);

  expect(screen.getByRole('heading', { name: 'LOADOUT' })).toBeTruthy();
  expect(screen.getByText('10 POINTS · SPEND ONE, LOSE THE OTHER')).toBeTruthy();
  expect(screen.getByRole('table', { name: 'CONTROLS' })).toBeTruthy();
});

it('shows SPEED then POWER for the allocation', () => {
  const { container } = setup(3);

  const statElements = [...container.querySelectorAll('.loadout__stat')];
  const stats = statElements.map((stat) => [stat.className, stat.textContent]);

  expect(stats).toEqual([
    ['loadout__stat loadout__stat--speed', 'SPEED130%'],
    ['loadout__stat loadout__stat--power', 'POWER170%'],
  ]);
});

it('offers a 0–10 slider of speed points between POWER and SPEED', () => {
  const { container } = setup(7);

  const name = 'Points spent on speed';
  const slider = screen.getByRole('slider', { name }) as HTMLInputElement;
  const { type, min, max, step, value } = slider;

  expect([type, min, max, step, value]).toEqual(['range', '0', '10', '1', '7']);
  const sliderRow = container.querySelector('.loadout__slider-row') as HTMLElement;
  const row = [...sliderRow.children].map((child) => child.textContent);

  expect(row).toEqual(['POWER', '', 'SPEED']);
});

it('sets points from the slider', () => {
  const { onSpeedPointsChange } = setup(5);

  fireEvent.change(screen.getByRole('slider'), { target: { value: '9' } });

  expect(onSpeedPointsChange).toHaveBeenCalledWith(9);
});

it.each([
  [0, 'ArrowLeft', 0],
  [0, 'ArrowRight', 1],
  [10, 'ArrowRight', 10],
  [10, 'ArrowLeft', 9],
])('from %i points, %s sets %i points', (points, key, expected) => {
  const { onSpeedPointsChange } = setup(points);

  fireEvent.keyDown(window, { key });

  expect(onSpeedPointsChange).toHaveBeenCalledWith(expected);
});

it('starts the run from the START button and from Enter', () => {
  const { onStart } = setup(5);

  fireEvent.click(screen.getByRole('button', { name: 'START' }));
  fireEvent.keyDown(window, { key: 'Enter' });

  expect(onStart).toHaveBeenCalledTimes(2);
});
