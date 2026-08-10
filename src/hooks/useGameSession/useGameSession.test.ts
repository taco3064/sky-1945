import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useGameSession } from './useGameSession';
import type { SessionEvent } from '~app/engine/session';

describe('useGameSession', () => {
  it('opens on the title screen', () => {
    const { result } = renderHook(() => useGameSession());

    expect(result.current.state).toBe('title');
  });

  it('walks a whole run and loops back to the title', () => {
    const { result } = renderHook(() => useGameSession());
    const seen: string[] = [result.current.state];

    for (const event of ['start', 'confirm', 'die', 'reset'] as SessionEvent[]) {
      act(() => result.current.send(event));
      seen.push(result.current.state);
    }

    expect(seen).toEqual(['title', 'loadout', 'playing', 'gameover', 'title']);
  });

  it('ignores an event the current state refuses', () => {
    const { result } = renderHook(() => useGameSession());

    act(() => result.current.send('resume'));

    expect(result.current.state).toBe('title');
  });

  // `send` is passed straight to onPointerDown and into useAnyKey's ref. A
  // send that changed identity every render would rebind those on each one —
  // the reason it is wrapped in useCallback, asserted rather than assumed.
  it('keeps send stable across renders', () => {
    const { result, rerender } = renderHook(() => useGameSession());
    const first = result.current.send;

    rerender();
    act(() => result.current.send('start'));

    expect(result.current.send).toBe(first);
  });
});
