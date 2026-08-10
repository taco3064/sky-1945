import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useLoadout } from './useLoadout';
import { DEFAULT_POINTS, LOADOUT_POINTS } from '~app/engine/boosts';

describe('useLoadout', () => {
  it('starts a run at the default allocation', () => {
    const { result } = renderHook(() => useLoadout());

    expect(result.current.speedPoints).toBe(DEFAULT_POINTS);
  });

  it('sets the allocation outright', () => {
    const { result } = renderHook(() => useLoadout());

    act(() => result.current.setSpeedPoints(8));

    expect(result.current.speedPoints).toBe(8);
  });

  it('rounds and holds a value the slider could not produce', () => {
    const { result } = renderHook(() => useLoadout());

    act(() => result.current.setSpeedPoints(99));

    expect(result.current.speedPoints).toBe(LOADOUT_POINTS);
  });

  it('moves the allocation by a delta', () => {
    const { result } = renderHook(() => useLoadout());

    act(() => result.current.adjustSpeedPoints(2));
    act(() => result.current.adjustSpeedPoints(-1));

    expect(result.current.speedPoints).toBe(DEFAULT_POINTS + 1);
  });

  it('stops at the ends rather than wrapping', () => {
    const { result } = renderHook(() => useLoadout());

    act(() => result.current.adjustSpeedPoints(-99));
    expect(result.current.speedPoints).toBe(0);

    act(() => result.current.adjustSpeedPoints(-1));
    expect(result.current.speedPoints).toBe(0);

    act(() => result.current.adjustSpeedPoints(99));
    expect(result.current.speedPoints).toBe(LOADOUT_POINTS);
  });

  // adjust reads the current value through the updater rather than a closure,
  // so a burst of key repeats inside one render batch still lands on +3.
  it('accumulates adjustments made in a single batch', () => {
    const { result } = renderHook(() => useLoadout());

    act(() => {
      result.current.adjustSpeedPoints(1);
      result.current.adjustSpeedPoints(1);
      result.current.adjustSpeedPoints(1);
    });

    expect(result.current.speedPoints).toBe(DEFAULT_POINTS + 3);
  });

  it('keeps both setters stable across renders', () => {
    const { result, rerender } = renderHook(() => useLoadout());
    const { setSpeedPoints, adjustSpeedPoints } = result.current;

    rerender();
    act(() => result.current.adjustSpeedPoints(1));

    expect(result.current.setSpeedPoints).toBe(setSpeedPoints);
    expect(result.current.adjustSpeedPoints).toBe(adjustSpeedPoints);
  });
});
