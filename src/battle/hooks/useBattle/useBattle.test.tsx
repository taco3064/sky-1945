import { act, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BattleStore } from '~app/battle/models/simulation';
import { useBattle, useBattleLoop } from './useBattle';

let frames: FrameRequestCallback[] = [];

beforeEach(() => {
  frames = [];
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => frames.push(callback));
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  vi.spyOn(performance, 'now').mockReturnValue(0);
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Runs the pending animation frame at `timestamp`. */
function runFrame(timestamp: number) {
  const callback = frames.shift();

  act(() => callback?.(timestamp));
}

describe('useBattle', () => {
  it('starts one run per mount and places its entities on mount', () => {
    const place = vi.fn();
    const { result, rerender } = renderHook(() => useBattle(5, place));
    const { store } = result.current;

    rerender();

    expect(result.current.store).toBe(store);
    expect(result.current.view).toMatchObject({ lives: 3, round: 1 });
    expect(place).toHaveBeenCalledWith(1, 270, 1020, 0);
  });

  it('re-renders with the published view', () => {
    const { result } = renderHook(() => useBattle(5, vi.fn()));

    act(() => {
      result.current.store.resume(0);
      result.current.store.frame(16);
    });

    expect(result.current.view.enemies.length).toBe(4);
  });
});

describe('useBattleLoop', () => {
  function Loop({ store, running, place }: { store: BattleStore; running: boolean; place: () => void }) {
    useBattleLoop(store, running, place);

    return null;
  }

  it('steps and places once per animation frame while running, measuring from the start', () => {
    const { result } = renderHook(() => useBattle(5, vi.fn()));
    const { store } = result.current;
    const place = vi.fn();

    vi.mocked(performance.now).mockReturnValue(500);
    const frame = vi.spyOn(store, 'frame');
    const resume = vi.spyOn(store, 'resume');

    render(<Loop store={store} running place={place} />);
    runFrame(516);
    runFrame(532);

    expect(resume).toHaveBeenCalledWith(500);
    expect(frame.mock.calls).toEqual([[516], [532]]);
    expect(place).toHaveBeenCalledWith(1, 270, expect.any(Number), 0);
    expect(frames.length).toBe(1);
  });

  it('does not run while stopped and cancels the pending frame when stopped', () => {
    const { result } = renderHook(() => useBattle(5, vi.fn()));
    const { store } = result.current;
    const frame = vi.spyOn(store, 'frame');

    const view = render(<Loop store={store} running={false} place={vi.fn()} />);

    expect(frames.length).toBe(0);

    view.rerender(<Loop store={store} running place={vi.fn()} />);
    view.rerender(<Loop store={store} running={false} place={vi.fn()} />);

    expect(window.cancelAnimationFrame).toHaveBeenCalled();
    expect(frame).not.toHaveBeenCalled();
  });

  it('schedules nothing more once stopped during a frame', () => {
    const { result } = renderHook(() => useBattle(5, vi.fn()));
    const { store } = result.current;

    let stop = () => {};

    vi.spyOn(store, 'frame').mockImplementation(() => stop());

    const view = render(<Loop store={store} running place={vi.fn()} />);

    stop = () => view.rerender(<Loop store={store} running={false} place={vi.fn()} />);
    runFrame(16);

    expect(frames.length).toBe(0);
  });
});
