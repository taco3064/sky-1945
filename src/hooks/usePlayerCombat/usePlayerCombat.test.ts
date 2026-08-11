import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { usePlayerCombat } from './usePlayerCombat';
import type { CombatSnapshot } from '~app/engine/combat';
import type { CombatListener, World } from '~app/engine/world';

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
  const watchers = new Set<CombatListener>();

  const world = stubWorld({
    subscribeCombat: vi.fn((onChange) => {
      watchers.add(onChange);

      return () => {
        watchers.delete(onChange);
      };
    }),
  });

  const send = (snapshot: CombatSnapshot): void => {
    act(() => {
      for (const onChange of watchers) {
        onChange(snapshot);
      }
    });
  };

  return { world, send, watcherCount: () => watchers.size };
}

describe('usePlayerCombat', () => {
  it('starts idle', () => {
    const { world } = drivenWorld();
    const { result } = renderHook(() => usePlayerCombat(world));

    expect(result.current).toEqual({ rolling: false, invulnerable: false, ready: true });
  });

  it('reports a roll starting and ending', () => {
    const { world, send } = drivenWorld();
    const { result } = renderHook(() => usePlayerCombat(world));

    send({ rolling: true, invulnerable: true, ready: false });
    expect(result.current.rolling).toBe(true);

    send({ rolling: false, invulnerable: false, ready: true });
    expect(result.current.rolling).toBe(false);
  });

  // The two fields are separate because the roll can end while protection
  // continues — respawn (#6) writes the same invulnerability.
  it('can be protected without rolling', () => {
    const { world, send } = drivenWorld();
    const { result } = renderHook(() => usePlayerCombat(world));

    send({ rolling: false, invulnerable: true, ready: true });

    expect(result.current).toEqual({ rolling: false, invulnerable: true, ready: true });
  });

  it('unsubscribes on unmount', () => {
    const { world, watcherCount } = drivenWorld();
    const { unmount } = renderHook(() => usePlayerCombat(world));

    unmount();

    expect(watcherCount()).toBe(0);
  });
});
