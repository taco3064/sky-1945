import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import { useEntityTransform } from './useEntityTransform';
import { GameProvider } from '~app/contexts/GameContext';
import type { FrameListener, World } from '~app/engine/world';

/** A world that publishes only when a test tells it to. */
function stubWorld() {
  const listeners = new Map<number, Set<FrameListener>>();

  const world: World = {
    playerId: 7,
    start: vi.fn(),
    pause: vi.fn(),
    dispose: vi.fn(),
    setPlayerDirection: vi.fn(),
    roll: vi.fn(),
    subscribeRoster: vi.fn(() => () => {}),
    subscribeCombat: vi.fn(() => () => {}),
    subscribe: vi.fn((id, onFrame) => {
      const watching = listeners.get(id) ?? new Set<FrameListener>();

      watching.add(onFrame);
      listeners.set(id, watching);

      return () => {
        watching.delete(onFrame);
      };
    }),
  };

  const emit = (id: number, x: number, y: number, angle = 0): void => {
    for (const onFrame of listeners.get(id) ?? []) {
      onFrame({ x, y, angle });
    }
  };

  return { world, emit };
}

function wrapperFor(world: World) {
  return ({ children }: { children: ReactNode }) => (
    <GameProvider world={world}>{children}</GameProvider>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useEntityTransform', () => {
  it('subscribes to the entity it was given', () => {
    const { world } = stubWorld();

    renderHook(() => useEntityTransform(7), { wrapper: wrapperFor(world) });

    expect(world.subscribe).toHaveBeenCalledWith(7, expect.any(Function));
  });

  // The whole point: a frame arrives and the DOM changes, with no render in
  // between. Nothing here goes through React state.
  it('writes the transform straight onto the element', () => {
    const { world, emit } = stubWorld();

    const { result } = renderHook(() => useEntityTransform(7), {
      wrapper: wrapperFor(world),
    });

    const element = document.createElement('div');

    result.current.current = element;
    emit(7, 120.5, 400, 90);

    expect(element.style.transform).toBe('translate3d(120.5px, 400px, 0) rotate(90deg)');
  });

  it('survives a frame arriving before the element is attached', () => {
    const { world, emit } = stubWorld();

    renderHook(() => useEntityTransform(7), { wrapper: wrapperFor(world) });

    expect(() => emit(7, 10, 10)).not.toThrow();
  });

  it('unsubscribes on unmount', () => {
    const { world, emit } = stubWorld();

    const { result, unmount } = renderHook(() => useEntityTransform(7), {
      wrapper: wrapperFor(world),
    });

    const element = document.createElement('div');

    result.current.current = element;
    unmount();
    emit(7, 300, 300);

    expect(element.style.transform).toBe('');
  });

  // Without a provider there is no world, and a silently dead subscription
  // would look like an aircraft that renders but never moves.
  it('refuses to run outside a provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useEntityTransform(7))).toThrow(/GameProvider/);
  });
});
