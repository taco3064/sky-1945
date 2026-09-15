import { render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useStageScale } from './useStageScale';

type Resize = (entries: { contentRect: { width: number; height: number } }[]) => void;

let resize: Resize;
const observe = vi.fn();
const disconnect = vi.fn();

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: Resize) {
        resize = callback;
      }

      observe = observe;
      disconnect = disconnect;
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function Viewport({ attach = true }: { attach?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useStageScale(ref);

  return <div data-testid="viewport" ref={attach ? ref : undefined} />;
}

it.each([
  [390, 844, String(390 / 540)],
  [1440, 900, String(900 / 960)],
])('fits the field into a %i × %i content box', (width, height, scale) => {
  const { getByTestId } = render(<Viewport />);
  const viewport = getByTestId('viewport');

  resize([{ contentRect: { width, height } }]);

  expect(observe).toHaveBeenCalledWith(viewport);
  expect(viewport.style.getPropertyValue('--stage-scale')).toBe(scale);
});

it('stops observing on unmount', () => {
  const { unmount } = render(<Viewport />);

  unmount();

  expect(disconnect).toHaveBeenCalled();
});

it('does nothing without a viewport element', () => {
  render(<Viewport attach={false} />);

  expect(observe).not.toHaveBeenCalled();
});
