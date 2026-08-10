import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useKeyMap } from './useKeyMap';

function press(key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, cancelable: true });

  window.dispatchEvent(event);

  return event;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useKeyMap', () => {
  it('runs the handler for a mapped key', () => {
    const left = vi.fn();
    const right = vi.fn();

    renderHook(() => useKeyMap({ ArrowLeft: left, ArrowRight: right }));
    press('ArrowLeft');
    press('ArrowLeft');
    press('ArrowRight');

    expect(left).toHaveBeenCalledTimes(2);
    expect(right).toHaveBeenCalledTimes(1);
  });

  it('leaves an unmapped key entirely alone', () => {
    const enter = vi.fn();

    renderHook(() => useKeyMap({ Enter: enter }));
    const event = press('q');

    expect(enter).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  // `event.key` is a string from outside this codebase. A plain lookup walks
  // the prototype, so these two names would each find a real function on
  // Object.prototype, pass a truthiness check, and be called as a handler.
  it.each(['constructor', 'toString', 'valueOf', 'hasOwnProperty'])(
    'does not treat Object.prototype.%s as a handler',
    (inherited) => {
      const enter = vi.fn();

      renderHook(() => useKeyMap({ Enter: enter }));
      const event = press(inherited);

      expect(enter).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    },
  );

  // Arrows scroll the page otherwise, and a game screen sliding under the
  // player while they adjust the loadout is never what was meant.
  it('prevents the default only on a key it handles', () => {
    renderHook(() => useKeyMap({ ArrowLeft: () => {} }));

    expect(press('ArrowLeft').defaultPrevented).toBe(true);
    expect(press('ArrowRight').defaultPrevented).toBe(false);
  });

  it('unbinds on unmount', () => {
    const enter = vi.fn();
    const { unmount } = renderHook(() => useKeyMap({ Enter: enter }));

    unmount();
    press('Enter');

    expect(enter).not.toHaveBeenCalled();
  });

  it('runs the newest handler after a re-render', () => {
    const first = vi.fn();
    const second = vi.fn();

    const { rerender } = renderHook(({ onEnter }) => useKeyMap({ Enter: onEnter }), {
      initialProps: { onEnter: first },
    });

    rerender({ onEnter: second });
    press('Enter');

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  // Callers pass an object literal of inline arrows — a new object every
  // render, which is exactly what the ref exists to survive.
  it('binds the listener exactly once across re-renders', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const { rerender } = renderHook(() => useKeyMap({ Enter: () => {} }));

    rerender();
    rerender();

    const keydownBinds = add.mock.calls.filter(([type]) => type === 'keydown');

    expect(keydownBinds).toHaveLength(1);
  });
});
