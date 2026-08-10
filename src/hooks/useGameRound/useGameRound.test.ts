import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useGameRound } from './useGameRound';
import type { RoundListener, World } from '~app/engine/world';

function stubWorld(overrides: Partial<World> = {}): World {
  return {
    playerId: 1,
    start: vi.fn(),
    pause: vi.fn(),
    dispose: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    subscribeRoster: vi.fn(() => () => {}),
    subscribeCombat: vi.fn(() => () => {}),
    subscribeRound: vi.fn(() => () => {}),
    subscribeLives: vi.fn(() => () => {}),
    subscribeGameOver: vi.fn(() => () => {}),
    subscribeBoss: vi.fn(() => () => {}),
    setPlayerDirection: vi.fn(),
    roll: vi.fn(),
    ...overrides,
  };
}

function drivenWorld() {
  const watchers = new Set<RoundListener>();

  const world = stubWorld({
    subscribeRound: vi.fn((onChange) => {
      watchers.add(onChange);

      return () => {
        watchers.delete(onChange);
      };
    }),
  });

  const send = (round: number): void => {
    act(() => {
      for (const onChange of watchers) {
        onChange(round);
      }
    });
  };

  return { world, send, watcherCount: () => watchers.size };
}

describe('useGameRound', () => {
  it('starts on round one', () => {
    const { world } = drivenWorld();
    const { result } = renderHook(() => useGameRound(world));

    expect(result.current).toBe(1);
  });

  it('follows the round the world announces', () => {
    const { world, send } = drivenWorld();
    const { result } = renderHook(() => useGameRound(world));

    send(2);
    expect(result.current).toBe(2);

    send(3);
    expect(result.current).toBe(3);
  });

  it('unsubscribes on unmount', () => {
    const { world, watcherCount } = drivenWorld();
    const { unmount } = renderHook(() => useGameRound(world));

    expect(watcherCount()).toBe(1);

    unmount();

    expect(watcherCount()).toBe(0);
  });
});
