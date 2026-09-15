import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAnyKey } from './useAnyKey';

function press(key = 'a'): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key }));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useAnyKey', () => {
  it('fires on any key, not a particular one', () => {
    const onPress = vi.fn();

    renderHook(() => useAnyKey(onPress));
    press('a');
    press('Escape');
    press(' ');

    expect(onPress).toHaveBeenCalledTimes(3);
  });

  it('unbinds on unmount', () => {
    const onPress = vi.fn();
    const { unmount } = renderHook(() => useAnyKey(onPress));

    unmount();
    press();

    expect(onPress).not.toHaveBeenCalled();
  });

  it('calls the newest callback after a re-render', () => {
    const first = vi.fn();
    const second = vi.fn();

    const { rerender } = renderHook(({ onPress }) => useAnyKey(onPress), {
      initialProps: { onPress: first },
    });

    rerender({ onPress: second });
    press();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  // The point of the ref: callers pass an inline arrow, so a dependency on it
  // would tear down and rebind the listener every render.
  it('binds the listener exactly once across re-renders', () => {
    const add = vi.spyOn(window, 'addEventListener');

    const { rerender } = renderHook(({ onPress }) => useAnyKey(onPress), {
      initialProps: { onPress: () => {} },
    });

    rerender({ onPress: () => {} });
    rerender({ onPress: () => {} });

    const keydownBinds = add.mock.calls.filter(([type]) => type === 'keydown');

    expect(keydownBinds).toHaveLength(1);
  });
});
