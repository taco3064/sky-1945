import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useLives } from './useLives';
import { STARTING_LIVES } from '~app/engine/combat';
import type { GameOverListener, LivesListener } from '~app/engine/world';
import { stubWorld } from '~app/fixtures/world.fixtures';

function drivenWorld() {
  const lifeWatchers = new Set<LivesListener>();
  const overWatchers = new Set<GameOverListener>();

  // The ninth copy of the stub, missed by #27 because it was written inline rather
  // than as a `stubWorld` helper — so the search that found the other eight walked
  // straight past it.
  const world = stubWorld({
    subscribeLives: vi.fn((onChange) => {
      lifeWatchers.add(onChange);

      return () => {
        lifeWatchers.delete(onChange);
      };
    }),
    subscribeGameOver: vi.fn((onGameOver) => {
      overWatchers.add(onGameOver);

      return () => {
        overWatchers.delete(onGameOver);
      };
    }),
  });

  return {
    world,
    sendLives: (remaining: number) => act(() => {
      for (const onChange of lifeWatchers) {
        onChange(remaining);
      }
    }),
    sendGameOver: () => act(() => {
      for (const onGameOver of overWatchers) {
        onGameOver();
      }
    }),
    watching: () => lifeWatchers.size + overWatchers.size,
  };
}

describe('useLives', () => {
  it('starts at a full set', () => {
    const { world } = drivenWorld();
    const { result } = renderHook(() => useLives(world, () => {}));

    expect(result.current).toBe(STARTING_LIVES);
  });

  it('mirrors what the engine spends', () => {
    const { world, sendLives } = drivenWorld();
    const { result } = renderHook(() => useLives(world, () => {}));

    sendLives(2);
    expect(result.current).toBe(2);

    sendLives(1);
    expect(result.current).toBe(1);
  });

  it('forwards the end of the run', () => {
    const { world, sendGameOver } = drivenWorld();
    const onGameOver = vi.fn();

    renderHook(() => useLives(world, onGameOver));
    sendGameOver();

    expect(onGameOver).toHaveBeenCalledOnce();
  });

  // Callers pass an inline arrow, so depending on it would resubscribe to two
  // channels on every render.
  it('calls the newest callback without resubscribing', () => {
    const { world, sendGameOver } = drivenWorld();
    const first = vi.fn();
    const second = vi.fn();

    const { rerender } = renderHook(({ onOver }) => useLives(world, onOver), {
      initialProps: { onOver: first },
    });

    rerender({ onOver: second });
    sendGameOver();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    expect(vi.mocked(world.subscribeGameOver)).toHaveBeenCalledOnce();
  });

  it('unsubscribes from both channels on unmount', () => {
    const { world, watching } = drivenWorld();
    const { unmount } = renderHook(() => useLives(world, () => {}));

    expect(watching()).toBe(2);

    unmount();

    expect(watching()).toBe(0);
  });
});
