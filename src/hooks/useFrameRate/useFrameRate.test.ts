import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useFrameRate } from './useFrameRate';
import type { FrameRate, FrameRateListener } from '~app/engine/world';
import { stubWorld } from '~app/fixtures/world.fixtures';

function drivenWorld() {
  const watchers = new Set<FrameRateListener>();

  const world = stubWorld({
    subscribeFrameRate: vi.fn((onChange) => {
      watchers.add(onChange);

      return () => {
        watchers.delete(onChange);
      };
    }),
  });

  const send = (rate: FrameRate): void => {
    act(() => {
      for (const onChange of watchers) {
        onChange(rate);
      }
    });
  };

  return { world, send, watchers };
}

describe('useFrameRate', () => {
  // Zero rather than 60: nothing has been measured until the first window closes,
  // and a guessed 60 would be the readout lying during the one moment anyone is
  // looking at it — start-up.
  it('reports nothing before the first reading', () => {
    const { result } = renderHook(() => useFrameRate(stubWorld()));

    expect(result.current).toEqual({ fps: 0, worst: 0 });
  });

  it('subscribes once', () => {
    const world = stubWorld();

    renderHook(() => useFrameRate(world));

    expect(world.subscribeFrameRate).toHaveBeenCalledTimes(1);
  });

  it('reports what the engine measured', () => {
    const { world, send } = drivenWorld();
    const { result } = renderHook(() => useFrameRate(world));

    send({ fps: 58, worst: 34 });

    expect(result.current).toEqual({ fps: 58, worst: 34 });
  });

  it('replaces the reading each window rather than accumulating', () => {
    const { world, send } = drivenWorld();
    const { result } = renderHook(() => useFrameRate(world));

    send({ fps: 60, worst: 17 });
    send({ fps: 41, worst: 48 });

    expect(result.current).toEqual({ fps: 41, worst: 48 });
  });

  it('unsubscribes on unmount', () => {
    const { world, watchers } = drivenWorld();
    const { unmount } = renderHook(() => useFrameRate(world));

    expect(watchers.size).toBe(1);

    unmount();

    expect(watchers.size).toBe(0);
  });

  it('resubscribes when handed a different world', () => {
    const first = drivenWorld();
    const second = drivenWorld();

    const { rerender, result } = renderHook(
      ({ world }) => useFrameRate(world),
      { initialProps: { world: first.world } },
    );

    rerender({ world: second.world });

    expect(first.watchers.size).toBe(0);

    second.send({ fps: 30, worst: 55 });

    expect(result.current.fps).toBe(30);
  });
});
