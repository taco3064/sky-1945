import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { usePlayerInput } from './usePlayerInput';
import type { World } from '~app/engine/world';

function stubWorld(): World {
  return {
    playerId: 1,
    start: vi.fn(),
    dispose: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    setPlayerDirection: vi.fn(),
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

describe('usePlayerInput', () => {
  it('points the world when a direction key goes down', () => {
    const world = stubWorld();

    renderHook(() => usePlayerInput(world));
    keyDown('ArrowRight');

    expect(lastDirection(world)).toEqual([1, 0]);
  });

  it('sums the keys being held', () => {
    const world = stubWorld();

    renderHook(() => usePlayerInput(world));
    keyDown('ArrowRight');
    keyDown('ArrowUp');

    expect(lastDirection(world)).toEqual([1, -1]);
  });

  it('drops a key on release and keeps the rest', () => {
    const world = stubWorld();

    renderHook(() => usePlayerInput(world));
    keyDown('ArrowRight');
    keyDown('ArrowUp');
    keyUp('ArrowRight');

    expect(lastDirection(world)).toEqual([0, -1]);
  });

  it('ignores a repeat of a key already held', () => {
    const world = stubWorld();

    renderHook(() => usePlayerInput(world));
    keyDown('ArrowRight');
    keyDown('ArrowRight');

    expect(lastDirection(world)).toEqual([1, 0]);
  });

  it('leaves keys it does not steer with alone', () => {
    const world = stubWorld();

    renderHook(() => usePlayerInput(world));

    const event = keyDown('a');

    expect(world.setPlayerDirection).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('prevents the default on keys it does steer with', () => {
    const world = stubWorld();

    renderHook(() => usePlayerInput(world));

    expect(keyDown('ArrowDown').defaultPrevented).toBe(true);
  });

  it('ignores a keyup for a key that was never down', () => {
    const world = stubWorld();

    renderHook(() => usePlayerInput(world));
    keyUp('ArrowLeft');

    expect(world.setPlayerDirection).not.toHaveBeenCalled();
  });

  // A key held while the window loses focus never sends its keyup, and the
  // aircraft would fly off in that direction until it was pressed again.
  it('lets go of everything when the window loses focus', () => {
    const world = stubWorld();

    renderHook(() => usePlayerInput(world));
    keyDown('ArrowLeft');
    keyDown('ArrowDown');
    window.dispatchEvent(new Event('blur'));

    expect(lastDirection(world)).toEqual([0, 0]);
  });

  it('stops the aircraft and stops listening on unmount', () => {
    const world = stubWorld();
    const { unmount } = renderHook(() => usePlayerInput(world));

    keyDown('ArrowRight');
    unmount();

    expect(lastDirection(world)).toEqual([0, 0]);

    const afterUnmount = vi.mocked(world.setPlayerDirection).mock.calls.length;

    keyDown('ArrowLeft');

    expect(vi.mocked(world.setPlayerDirection).mock.calls).toHaveLength(afterUnmount);
  });
});
