import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Battle } from '~app/battle/hooks/useBattle';
import type { BattleStore, BattleView, Place } from '~app/battle/models/simulation';
import { Stage } from './Stage';

/** View fields to show instead of the run's own, and the store of the latest run. */
const battle = vi.hoisted(() => ({
  view: {} as Partial<BattleView>,
  store: null as BattleStore | null,
}));

vi.mock('~app/battle/hooks/useBattle', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~app/battle/hooks/useBattle')>();

  return {
    ...actual,
    useBattle: (speedPoints: number, place: Place): Battle => {
      const result = actual.useBattle(speedPoints, place);

      battle.store = result.store;

      return { ...result, view: { ...result.view, ...battle.view } };
    },
  };
});

let frames: FrameRequestCallback[] = [];

/** Spies on Pulse attempts reaching the run. */
function spyPulse() {
  return vi.spyOn(battle.store as BattleStore, 'pulse');
}

beforeEach(() => {
  battle.view = {};
  frames = [];

  vi.spyOn(window, 'requestAnimationFrame')
    .mockImplementation((callback) => frames.push(callback));

  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {
    frames = [];
  });

  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );

  HTMLElement.prototype.setPointerCapture = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Class names of an element's children, in paint order. */
function childClasses(parent: Element): string[] {
  return [...parent.children].map((child) => child.className);
}

function setup(speedPoints = 5) {
  const onQuit = vi.fn();
  const view = render(<Stage speedPoints={speedPoints} onQuit={onQuit} />);
  const stage = view.container.firstElementChild as HTMLElement;

  return { onQuit, stage, ...view };
}

describe('layout', () => {
  it('paints the field, touch surface, touch stick and HUD in that order', () => {
    const { stage } = setup(8);

    expect(stage.className).toBe('stage');

    expect(childClasses(stage))
      .toEqual(['stage__field', 'stage__touch', 'touch-stick', 'hud']);

    const field = stage.firstElementChild as HTMLElement;
    const speedLines = field.firstElementChild as HTMLElement;

    expect(childClasses(field)).toEqual(['speed-lines', 'ally ally--protected']);
    expect(speedLines.style.getPropertyValue('--pace')).toBe('1.8');
  });

  it('places the aircraft at its launch point before the first frame', () => {
    const { stage } = setup();

    expect(stage.querySelector<HTMLElement>('.ally')?.style.transform)
      .toBe('translate3d(270px, 1020px, 0) rotate(0deg)');
  });
});

describe('playing', () => {
  it('runs the simulation every frame and places new entities in that frame', () => {
    const { stage } = setup();

    act(() => frames.shift()?.(performance.now() + 16));

    const enemies = stage.querySelectorAll<HTMLElement>('.enemy');

    expect(enemies.length).toBe(4);
    expect(enemies[0].style.transform).toMatch(/rotate\(180deg\)$/);
    expect(frames.length).toBe(1);
  });

  it('steers and rolls from the keyboard and the touch surface', () => {
    const { stage } = setup();

    fireEvent.keyDown(window, { key: ' ' });

    expect(stage.querySelector('.ally')?.className)
      .toBe('ally ally--protected ally--rolling ally--spent');

    const surface = stage.querySelector('.stage__touch') as HTMLElement;
    const stick = stage.querySelector('.touch-stick');

    fireEvent.pointerDown(surface, { pointerId: 1, clientX: 50, clientY: 60 });
    expect(stick?.classList.contains('touch-stick--active')).toBe(true);
  });
});

describe('pause', () => {
  it('pauses on Escape: the overlay goes under the HUD and the simulation stops', () => {
    const { stage } = setup();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(childClasses(stage))
      .toEqual(['stage__field', 'stage__touch', 'touch-stick', 'overlay', 'hud']);

    expect(screen.getByText('PAUSED')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Resume' }).textContent).toBe('▶');
    expect(frames.length).toBe(0);
  });

  it('resumes from RESUME, the pause button and Escape', () => {
    setup();

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    fireEvent.click(screen.getByRole('button', { name: 'RESUME' }));
    expect(screen.queryByText('PAUSED')).toBeNull();

    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    expect(screen.queryByText('PAUSED')).toBeNull();
    expect(frames.length).toBe(1);
  });

  it('quits to the title from QUIT', () => {
    const { onQuit } = setup();

    fireEvent.keyDown(window, { key: 'Escape' });

    fireEvent.click(screen.getByRole('button', { name: 'QUIT' }));

    expect(onQuit).toHaveBeenCalledTimes(1);
  });
});

describe('PULSE DRIVE', () => {
  it('attempts a Pulse from X and the PULSE button while playing', () => {
    setup();
    const pulse = spyPulse();

    fireEvent.keyDown(window, { key: 'x' });
    fireEvent.pointerDown(screen.getByRole('button', { name: 'PULSE' }));

    expect(pulse).toHaveBeenCalledTimes(2);
  });

  it('does nothing from X or the still visible PULSE button while paused', () => {
    setup();
    const pulse = spyPulse();

    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.keyDown(window, { key: 'X' });
    fireEvent.pointerDown(screen.getByRole('button', { name: 'PULSE' }));

    expect(pulse).not.toHaveBeenCalled();
  });

  it('lets another finger press PULSE while one steers, without a roll', () => {
    const { stage } = setup();
    const pulse = spyPulse();
    const surface = stage.querySelector('.stage__touch') as HTMLElement;

    const button = screen.getByRole('button', { name: 'PULSE' });

    fireEvent.pointerDown(surface, { pointerId: 1, clientX: 50, clientY: 60 });
    fireEvent.pointerDown(button, { pointerId: 2 });

    expect(pulse).toHaveBeenCalledTimes(1);
    expect(stage.querySelector('.ally')?.className).toBe('ally ally--protected');
  });

  it('draws an active Pulse in the field and shows the meter in the HUD', () => {
    battle.view = { energy: 100, pulse: { id: 99 } };
    const { stage } = setup();

    const field = stage.querySelector('.stage__field') as HTMLElement;

    expect(childClasses(field)).toEqual(['speed-lines', 'ally ally--protected', 'pulse']);
    expect(stage.querySelector('.hud .pulse-meter__value')?.textContent).toBe('READY');
  });
});

describe('game over', () => {
  it('shows the round reached, hides pause, ignores Escape and stops simulating', () => {
    battle.view = { gameOver: true, lives: 0, round: 4 };
    const { onQuit } = setup();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.getByText('GAME OVER')).toBeTruthy();
    expect(screen.getByText('REACHED ROUND 4')).toBeTruthy();
    expect(screen.queryByText('PAUSED')).toBeNull();
    expect(screen.queryByRole('button', { name: /Pause|Resume/ })).toBeNull();
    expect(frames.length).toBe(0);

    fireEvent.click(screen.getByRole('button', { name: 'TITLE' }));
    expect(onQuit).toHaveBeenCalledTimes(1);
  });

  it('hides the PULSE button and ignores X', () => {
    battle.view = { gameOver: true, lives: 0, energy: 100 };
    setup();
    const pulse = spyPulse();

    fireEvent.keyDown(window, { key: 'x' });

    expect(screen.queryByRole('button', { name: 'PULSE' })).toBeNull();
    expect(pulse).not.toHaveBeenCalled();
  });
});
