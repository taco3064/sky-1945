import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useKeyboardControls } from './keyboard';
import type { World } from '~app/engine/world';

function stubWorld(): World {
  return {
    playerId: 1,
    start: vi.fn(),
    pause: vi.fn(),
    dispose: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    subscribeRoster: vi.fn(() => () => {}),
    subscribeCombat: vi.fn(() => () => {}),
    setPlayerDirection: vi.fn(),
    roll: vi.fn(),
  };
}

function keyDown(key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, cancelable: true });

  window.dispatchEvent(event);

  return event;
}

function keyUp(key: string): void {
  window.dispatchEvent(new KeyboardEvent('keyup', { key }));
}

/** The last direction the world was pointed. */
function lastDirection(world: World): [number, number] {
  const calls = vi.mocked(world.setPlayerDirection).mock.calls;

  return calls[calls.length - 1] as [number, number];
}

describe('useKeyboardControls · steering', () => {
  it('points the world when a direction key goes down', () => {
    const world = stubWorld();

    renderHook(() => useKeyboardControls(world, () => {}));
    keyDown('ArrowRight');

    expect(lastDirection(world)).toEqual([1, 0]);
  });

  it('sums the keys being held', () => {
    const world = stubWorld();

    renderHook(() => useKeyboardControls(world, () => {}));
    keyDown('ArrowRight');
    keyDown('ArrowUp');

    expect(lastDirection(world)).toEqual([1, -1]);
  });

  it('drops a key on release and keeps the rest', () => {
    const world = stubWorld();

    renderHook(() => useKeyboardControls(world, () => {}));
    keyDown('ArrowRight');
    keyDown('ArrowUp');
    keyUp('ArrowRight');

    expect(lastDirection(world)).toEqual([0, -1]);
  });

  it('ignores a repeat of a key already held', () => {
    const world = stubWorld();

    renderHook(() => useKeyboardControls(world, () => {}));
    keyDown('ArrowRight');
    keyDown('ArrowRight');

    expect(lastDirection(world)).toEqual([1, 0]);
  });

  it('ignores a keyup for a key that was never down', () => {
    const world = stubWorld();

    renderHook(() => useKeyboardControls(world, () => {}));
    keyUp('ArrowLeft');

    expect(world.setPlayerDirection).not.toHaveBeenCalled();
  });

  // A key held while the window loses focus never sends its keyup, and the
  // aircraft would fly off in that direction until it was pressed again.
  it('lets go of everything when the window loses focus', () => {
    const world = stubWorld();

    renderHook(() => useKeyboardControls(world, () => {}));
    keyDown('ArrowLeft');
    keyDown('ArrowDown');
    window.dispatchEvent(new Event('blur'));

    expect(lastDirection(world)).toEqual([0, 0]);
  });
});

describe('useKeyboardControls · roll and pause', () => {
  it('rolls on Space', () => {
    const world = stubWorld();

    renderHook(() => useKeyboardControls(world, () => {}));

    expect(keyDown(' ').defaultPrevented).toBe(true);
    expect(world.roll).toHaveBeenCalledOnce();
  });

  it('does not steer on Space', () => {
    const world = stubWorld();

    renderHook(() => useKeyboardControls(world, () => {}));
    keyDown(' ');

    expect(world.setPlayerDirection).not.toHaveBeenCalled();
  });

  it('pauses on Escape', () => {
    const world = stubWorld();
    const onPause = vi.fn();

    renderHook(() => useKeyboardControls(world, onPause));
    keyDown('Escape');

    expect(onPause).toHaveBeenCalledOnce();
    expect(world.roll).not.toHaveBeenCalled();
  });

  // The pause callback is an inline arrow at every call site, so depending on
  // it would rebind three window listeners on every render.
  it('calls the newest pause callback without rebinding', () => {
    const world = stubWorld();
    const first = vi.fn();
    const second = vi.fn();
    const add = vi.spyOn(window, 'addEventListener');

    const { rerender } = renderHook(
      ({ onPause }) => useKeyboardControls(world, onPause),
      { initialProps: { onPause: first } },
    );

    rerender({ onPause: second });
    keyDown('Escape');

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    expect(add.mock.calls.filter(([type]) => type === 'keydown')).toHaveLength(1);

    add.mockRestore();
  });
});

describe('useKeyboardControls · other keys', () => {
  it('leaves keys it does not use alone', () => {
    const world = stubWorld();

    renderHook(() => useKeyboardControls(world, () => {}));

    const event = keyDown('a');

    expect(world.setPlayerDirection).not.toHaveBeenCalled();
    expect(world.roll).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('stops the aircraft and stops listening on unmount', () => {
    const world = stubWorld();
    const { unmount } = renderHook(() => useKeyboardControls(world, () => {}));

    keyDown('ArrowRight');
    unmount();

    expect(lastDirection(world)).toEqual([0, 0]);

    const settled = vi.mocked(world.setPlayerDirection).mock.calls.length;

    keyDown('ArrowLeft');

    expect(vi.mocked(world.setPlayerDirection).mock.calls).toHaveLength(settled);
  });
});
