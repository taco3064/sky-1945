import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useEntityRoster } from './useEntityRoster';
import type { EntityRecord, RosterListener, World } from '~app/engine/world';

function stubWorld() {
  const watchers = new Set<RosterListener>();

  const world: World = {
    playerId: 1,
    start: vi.fn(),
    pause: vi.fn(),
    dispose: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    subscribeCombat: vi.fn(() => () => {}),
    setPlayerDirection: vi.fn(),
    roll: vi.fn(),
    subscribeRoster: vi.fn((onChange) => {
      watchers.add(onChange);

      return () => {
        watchers.delete(onChange);
      };
    }),
  };

  const send = (entities: EntityRecord[]): void => {
    act(() => {
      for (const onChange of watchers) {
        onChange(entities);
      }
    });
  };

  return { world, send, watcherCount: () => watchers.size };
}

describe('useEntityRoster', () => {
  it('starts empty', () => {
    const { world } = stubWorld();
    const { result } = renderHook(() => useEntityRoster(world));

    expect(result.current).toEqual([]);
  });

  it('takes what the world sends', () => {
    const { world, send } = stubWorld();
    const { result } = renderHook(() => useEntityRoster(world));

    send([{ id: 1, kind: 'player' }, { id: 2, kind: 'bullet' }]);

    expect(result.current).toEqual([
      { id: 1, kind: 'player' },
      { id: 2, kind: 'bullet' },
    ]);
  });

  it('follows despawns as well as spawns', () => {
    const { world, send } = stubWorld();
    const { result } = renderHook(() => useEntityRoster(world));

    send([{ id: 1, kind: 'player' }, { id: 2, kind: 'bullet' }]);
    send([{ id: 1, kind: 'player' }]);

    expect(result.current).toHaveLength(1);
  });

  it('unsubscribes on unmount', () => {
    const { world, watcherCount } = stubWorld();
    const { unmount } = renderHook(() => useEntityRoster(world));

    expect(watcherCount()).toBe(1);

    unmount();

    expect(watcherCount()).toBe(0);
  });
});
