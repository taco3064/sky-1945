import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import { useEntityTransform } from './useEntityTransform';
import { GameProvider } from '~app/contexts/GameContext';
import type { FrameListener, World } from '~app/engine/world';
import { stubWorld } from '~app/fixtures/world.fixtures';

function drivenWorld() {
  const listeners = new Map<number, Set<FrameListener>>();

  const world = stubWorld({
    subscribe: vi.fn((id, onFrame) => {
      const watching = listeners.get(id) ?? new Set<FrameListener>();

      watching.add(onFrame);
      listeners.set(id, watching);

      return () => {
        watching.delete(onFrame);
      };
    }),
  });

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
    const { world } = drivenWorld();

    renderHook(() => useEntityTransform(7), { wrapper: wrapperFor(world) });

    expect(world.subscribe).toHaveBeenCalledWith(7, expect.any(Function));
  });

  // The whole point: a frame arrives and the DOM changes, with no render in
  // between. Nothing here goes through React state.
  it('writes the transform straight onto the element', () => {
    const { world, emit } = drivenWorld();

    const { result } = renderHook(() => useEntityTransform(7), {
      wrapper: wrapperFor(world),
    });

    const element = document.createElement('div');

    result.current.current = element;
    emit(7, 120.5, 400, 90);

    expect(element.style.transform).toBe('translate3d(120.5px, 400px, 0) rotate(90deg)');
  });

  it('survives a frame arriving before the element is attached', () => {
    const { world, emit } = drivenWorld();

    renderHook(() => useEntityTransform(7), { wrapper: wrapperFor(world) });

    expect(() => emit(7, 10, 10)).not.toThrow();
  });

  it('unsubscribes on unmount', () => {
    const { world, emit } = drivenWorld();

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

describe('useEntityTransform · leaning into a turn', () => {
  /** Attach an element to a driven world and hand back both. */
  function banking(id: number) {
    const { world, emit } = drivenWorld();

    const { result } = renderHook(() => useEntityTransform(id), {
      wrapper: wrapperFor(world),
    });

    const element = document.createElement('div');

    result.current.current = element;

    return { element, emit };
  }

  function leanOf(element: HTMLElement): number {
    return +element.style.getPropertyValue('--lean');
  }

  // The first frame has nothing to compare against, so there is no lean yet.
  it('reports no lean from a single frame', () => {
    const { element, emit } = banking(7);

    emit(7, 100, 400);

    expect(leanOf(element)).toBe(0);
  });

  it('leans right when the entity slides right, left when it slides left', () => {
    const { element, emit } = banking(7);

    emit(7, 100, 400);

    for (let step = 1; step < 30; step += 1) {
      emit(7, 100 + step * 6, 400);
    }

    const right = leanOf(element);

    for (let step = 1; step < 60; step += 1) {
      emit(7, 300 - step * 6, 400);
    }

    expect(right).toBeGreaterThan(0.5);
    expect(leanOf(element)).toBeLessThan(-0.5);
  });

  // Never past full deflection, however fast the thing is travelling.
  it('never reports more than a full lean', () => {
    const { element, emit } = banking(7);

    emit(7, 0, 400);

    for (let step = 1; step < 40; step += 1) {
      emit(7, step * 400, 400);
    }

    expect(leanOf(element)).toBeLessThanOrEqual(1);
  });

  /*
   * Eased rather than read raw. Frame-to-frame displacement is far too jumpy to draw
   * with — a player tapping left would flicker instead of banking.
   */
  it('eases toward the reading instead of snapping to it', () => {
    const { element, emit } = banking(7);

    emit(7, 100, 400);
    emit(7, 140, 400);

    const first = leanOf(element);

    emit(7, 180, 400);

    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(1);
    expect(leanOf(element)).toBeGreaterThan(first);
  });

  it('settles back to level when the sliding stops', () => {
    const { element, emit } = banking(7);

    emit(7, 100, 400);

    for (let step = 1; step < 30; step += 1) {
      emit(7, 100 + step * 6, 400);
    }

    for (let step = 0; step < 80; step += 1) {
      emit(7, 274, 400);
    }

    expect(Math.abs(leanOf(element))).toBeLessThan(0.02);
  });
});
