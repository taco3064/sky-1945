import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { Hud, type StagePhase } from './Hud';

type HudProps = Parameters<typeof Hud>[0];

const BOSS = {
  id: 4,
  size: 1,
  hp: 450,
  maxHp: 900,
  pose: 'firing',
  move: 'radial',
} as const;

function setup(overrides: Partial<HudProps> = {}) {
  const onPause = vi.fn();
  const onPulse = vi.fn();

  const props: HudProps = {
    lives: 3,
    round: 2,
    boss: null,
    fps: 0,
    worst: 0,
    energy: 0,
    phase: 'playing',
    onPause,
    onPulse,
    ...overrides,
  };

  const view = render(<Hud {...props} />);
  const hud = view.container.firstElementChild as HTMLElement;

  return { onPause, onPulse, props, hud, ...view };
}

it('lays out lives, round, boss bar, meters, PULSE and pause buttons in order', () => {
  const { hud } = setup({ boss: BOSS });

  expect(hud.className).toBe('hud');

  expect([...hud.children].map((child) => child.className)).toEqual([
    'hud__lives',
    'hud__round',
    'boss-bar boss-bar--normal',
    'hud__frame-meter',
    'pulse-meter',
    'pulse-button pulse-button--charging',
    'hud__pause',
  ]);
});

it('shows PULSE energy on the meter and the button, and attempts a Pulse', () => {
  const { onPulse } = setup({ energy: 100 });

  expect(screen.getByText('READY')).toBeTruthy();
  const button = screen.getByRole('button', { name: 'PULSE' });

  fireEvent.pointerDown(button);

  expect(button.className).toBe('pulse-button');
  expect(onPulse).toHaveBeenCalledTimes(1);
});

it('shows one life icon per remaining life and the round', () => {
  const { hud } = setup({ lives: 2, round: 11 });

  expect(hud.querySelectorAll('.hud__lives > .life-icon').length).toBe(2);
  expect(screen.getByText('ROUND 11').tagName).toBe('P');
  expect(hud.querySelector('.boss-bar')).toBeNull();
});

it('reads the frame meter, amber when slow', () => {
  const { hud, rerender, props } = setup();

  expect(screen.getByText('—').className).toBe('hud__frame-meter');

  rerender(<Hud {...props} fps={48} worst={33} />);

  expect(hud.querySelector('.hud__frame-meter')?.className)
    .toBe('hud__frame-meter hud__frame-meter--slow');

  expect(screen.getByText('48 FPS · 33ms')).toBeTruthy();
});

it.each<[StagePhase, string, string]>([
  ['playing', 'Pause', '❚❚'],
  ['paused', 'Resume', '▶'],
])('while %s the pause button reads %s', (phase, label, glyph) => {
  const { onPause } = setup({ phase });

  const button = screen.getByRole('button', { name: label });

  fireEvent.click(button);

  expect(button.textContent).toBe(glyph);
  expect(onPause).toHaveBeenCalledTimes(1);
});

it('keeps the PULSE button visible while paused', () => {
  setup({ phase: 'paused', energy: 100 });

  expect(screen.getByRole('button', { name: 'PULSE' })).toBeTruthy();
});

it('hides the PULSE and pause buttons during game over, keeping the meter', () => {
  const { hud } = setup({ phase: 'gameover', lives: 0, energy: 40 });

  expect(screen.queryByRole('button')).toBeNull();
  expect(hud.querySelector('.pulse-meter')?.textContent).toBe('PULSE40%');
});
