import { fireEvent, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useLoadoutKeys } from './useLoadoutKeys';

function setup() {
  const onStep = vi.fn();
  const onStart = vi.fn();
  const hook = renderHook(() => useLoadoutKeys({ onStep, onStart }));

  return { onStep, onStart, ...hook };
}

it('steps points with the arrow keys and prevents their default', () => {
  const { onStep } = setup();

  expect(fireEvent.keyDown(window, { key: 'ArrowLeft', cancelable: true })).toBe(false);
  expect(fireEvent.keyDown(window, { key: 'ArrowRight', cancelable: true })).toBe(false);

  expect(onStep.mock.calls).toEqual([[-1], [1]]);
});

it('starts the run on Enter and prevents its default', () => {
  const { onStart } = setup();

  expect(fireEvent.keyDown(window, { key: 'Enter', cancelable: true })).toBe(false);

  expect(onStart).toHaveBeenCalledTimes(1);
});

it('ignores other keys', () => {
  const { onStep, onStart } = setup();

  expect(fireEvent.keyDown(window, { key: ' ', cancelable: true })).toBe(true);

  expect(onStep).not.toHaveBeenCalled();
  expect(onStart).not.toHaveBeenCalled();
});

it('stops listening once unmounted', () => {
  const { onStart, unmount } = setup();

  unmount();
  fireEvent.keyDown(window, { key: 'Enter' });

  expect(onStart).not.toHaveBeenCalled();
});
