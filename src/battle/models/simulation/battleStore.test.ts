import { describe, expect, it, vi } from 'vitest';
import { createBattleStore } from './battleStore';

function placements(store: ReturnType<typeof createBattleStore>): Map<number, number[]> {
  const found = new Map<number, number[]>();

  store.forEachPlacement(({ id, x, y, angle }) => found.set(id, [x, y, angle]));

  return found;
}

type Store = ReturnType<typeof createBattleStore>;

/** Runs `frames` frames of `frameMs` from a resume at 0. */
function run(store: Store, frames: number, frameMs = 1000 / 60) {
  store.resume(0);

  for (let frame = 1; frame <= frames; frame++) {
    store.frame(frame * frameMs);
  }
}

describe('frames', () => {
  it('steps from the resume time, never more than 1/60 s per frame', () => {
    const store = createBattleStore(5, () => 0);

    store.resume(1000);
    store.frame(3000);

    expect(placements(store).get(1)?.[1]).toBeCloseTo(1020 - 620 / 60, 9);
  });

  it('does not step backwards on an early timestamp', () => {
    const store = createBattleStore(5, () => 0);

    store.resume(1000);
    store.frame(990);

    expect(placements(store).get(1)).toEqual([270, 1020, 0]);
  });

  it('brings squads in and places enemies turned 180°', () => {
    const store = createBattleStore(5, () => 0);

    run(store, 1);

    const { enemies } = store.getSnapshot();

    expect(enemies.map((enemy) => enemy.kind)).toEqual(Array(4).fill('small'));
    expect(placements(store).get(enemies[0].id)?.[2]).toBe(180);
  });

  it('notifies subscribers only when the view changes', () => {
    const store = createBattleStore(5, () => 0);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.resume(0);
    store.frame(16);
    expect(listener).toHaveBeenCalledTimes(1);
    const before = store.getSnapshot();

    store.frame(16);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toBe(before);

    unsubscribe();
    store.frame(1000);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('publishes frame readings once the window closes', () => {
    const store = createBattleStore(5, () => 0);

    run(store, 29, 17);
    expect(store.getSnapshot().fps).toBe(0);
    store.frame(30 * 17);

    expect(store.getSnapshot()).toMatchObject({ fps: 59, worst: 17 });
  });
});

describe('input', () => {
  it('steers the aircraft once it is in control', () => {
    const store = createBattleStore(10, () => 0);

    run(store, 30);

    store.steer({ x: -1, y: 0 });
    store.frame(31 * (1000 / 60));

    expect(placements(store).get(1)?.[0]).toBeCloseTo(270 - 600 / 60, 6);
  });

  it('shows a roll at once, and ignores a roll during cooldown', () => {
    const store = createBattleStore(5, () => 0);
    const listener = vi.fn();

    store.subscribe(listener);

    store.roll();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().player).toMatchObject({ rolling: true, spent: true });

    store.roll();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('uses Math.random for the boss roll by default', () => {
    expect(createBattleStore(5).getSnapshot().round).toBe(1);
  });
});
