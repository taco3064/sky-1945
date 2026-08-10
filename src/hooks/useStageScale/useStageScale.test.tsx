import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useStageScale } from './useStageScale';
import { WORLD_HEIGHT, WORLD_WIDTH } from '~app/engine/world';

/** jsdom has no ResizeObserver, so the test supplies one it can drive. */
class StubResizeObserver {
  static live: StubResizeObserver[] = [];

  observed: Element[] = [];
  disconnected = false;

  // Assigned in the body rather than declared as a constructor parameter
  // property: the template enables `erasableSyntaxOnly`, and a parameter
  // property is TypeScript that emits runtime code rather than erasing.
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    StubResizeObserver.live.push(this);
  }

  observe(target: Element): void {
    this.observed.push(target);
  }

  unobserve(): void {}

  disconnect(): void {
    this.disconnected = true;
  }

  resizeTo(width: number, height: number): void {
    this.callback(
      [{ contentRect: { width, height } } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }
}

function Stage() {
  const ref = useStageScale();

  return <div ref={ref} data-testid="viewport" />;
}

function latest(): StubResizeObserver {
  return StubResizeObserver.live[StubResizeObserver.live.length - 1];
}

beforeEach(() => {
  StubResizeObserver.live = [];
  vi.stubGlobal('ResizeObserver', StubResizeObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useStageScale', () => {
  it('watches the element it hands back', () => {
    const { getByTestId } = render(<Stage />);

    expect(latest().observed).toEqual([getByTestId('viewport')]);
  });

  // Width-limited: a tall narrow phone. The field fits the width and leaves
  // room above and below.
  it('fits to the width when the viewport is narrower than the ratio', () => {
    const { getByTestId } = render(<Stage />);

    latest().resizeTo(270, 900);

    expect(getByTestId('viewport').style.getPropertyValue('--stage-scale')).toBe('0.5');
  });

  // Height-limited: a wide desktop window. The field fits the height and the
  // page centres it, leaving bars either side.
  it('fits to the height when the viewport is wider than the ratio', () => {
    const { getByTestId } = render(<Stage />);

    latest().resizeTo(2000, 480);

    expect(getByTestId('viewport').style.getPropertyValue('--stage-scale')).toBe('0.5');
  });

  it('writes 1 at exactly the field size', () => {
    const { getByTestId } = render(<Stage />);

    latest().resizeTo(WORLD_WIDTH, WORLD_HEIGHT);

    expect(getByTestId('viewport').style.getPropertyValue('--stage-scale')).toBe('1');
  });

  it('disconnects on unmount', () => {
    const { unmount } = render(<Stage />);
    const observer = latest();

    unmount();

    expect(observer.disconnected).toBe(true);
  });

  // The hook bails before observing when there is nothing to observe.
  it('does nothing when the ref never lands on an element', () => {
    function Detached() {
      useStageScale();

      return null;
    }

    render(<Detached />);

    expect(StubResizeObserver.live).toHaveLength(0);
  });
});
