import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useHitPoints } from './useHitPoints';
import type { BossSnapshot } from '~app/engine/boss';
import type { BossListener, World } from '~app/engine/world';

function stubWorld(overrides: Partial<World> = {}): World {
  return {
    playerId: 1,
    start: vi.fn(),
    pause: vi.fn(),
    dispose: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    subscribeRoster: vi.fn(() => () => {}),
    subscribeCombat: vi.fn(() => () => {}),
    subscribeRound: vi.fn(() => () => {}),
    subscribeLives: vi.fn(() => () => {}),
    subscribeGameOver: vi.fn(() => () => {}),
    subscribeBoss: vi.fn(() => () => {}),
    setPlayerDirection: vi.fn(),
    roll: vi.fn(),
    ...overrides,
  };
}

function drivenWorld() {
  const watchers = new Set<BossListener>();

  const world = stubWorld({
    subscribeBoss: vi.fn((onChange) => {
      watchers.add(onChange);

      return () => {
        watchers.delete(onChange);
      };
    }),
  });

  const send = (boss: BossSnapshot | null): void => {
    act(() => {
      for (const onChange of watchers) {
        onChange(boss);
      }
    });
  };

  return { world, send, watchers };
}

const FIGHTING: BossSnapshot = {
  id: 9,
  hp: 2000,
  maxHp: 2000,
  stance: 'winding',
  attack: 'beam',
};

describe('useHitPoints', () => {
  it('has no boss before one is announced', () => {
    const { result } = renderHook(() => useHitPoints(stubWorld()));

    expect(result.current).toBeNull();
  });

  it('subscribes once', () => {
    const world = stubWorld();

    renderHook(() => useHitPoints(world));

    expect(world.subscribeBoss).toHaveBeenCalledTimes(1);
  });

  it('reports the boss it is told about', () => {
    const { world, send } = drivenWorld();
    const { result } = renderHook(() => useHitPoints(world));

    send(FIGHTING);

    expect(result.current).toEqual(FIGHTING);
  });

  // The bar's whole job. Damage arrives ten times a second and every drop has
  // to reach the number React renders.
  it('tracks damage as it lands', () => {
    const { world, send } = drivenWorld();
    const { result } = renderHook(() => useHitPoints(world));

    send({ ...FIGHTING, hp: 2000 });
    send({ ...FIGHTING, hp: 1400 });
    send({ ...FIGHTING, hp: 90 });

    expect(result.current?.hp).toBe(90);
    expect(result.current?.maxHp).toBe(2000);
  });

  it('carries the stance and the attack, so the tell can be drawn', () => {
    const { world, send } = drivenWorld();
    const { result } = renderHook(() => useHitPoints(world));

    send({ ...FIGHTING, stance: 'firing', attack: 'radial' });

    expect(result.current?.stance).toBe('firing');
    expect(result.current?.attack).toBe('radial');
  });

  // Null is the death of the boss, and the bar has to go with it — an empty
  // frame left on screen would read as a fight that never ended.
  it('clears when the boss dies', () => {
    const { world, send } = drivenWorld();
    const { result } = renderHook(() => useHitPoints(world));

    send(FIGHTING);
    send(null);

    expect(result.current).toBeNull();
  });

  it('unsubscribes on unmount', () => {
    const { world, send, watchers } = drivenWorld();
    const { unmount } = renderHook(() => useHitPoints(world));

    expect(watchers.size).toBe(1);

    unmount();

    expect(watchers.size).toBe(0);

    // Nothing to update, and nothing throws for trying.
    expect(() => send(FIGHTING)).not.toThrow();
  });

  it('resubscribes when handed a different world', () => {
    const first = drivenWorld();
    const second = drivenWorld();

    const { rerender, result } = renderHook(
      ({ world }) => useHitPoints(world),
      { initialProps: { world: first.world } },
    );

    rerender({ world: second.world });

    expect(first.watchers.size).toBe(0);

    second.send(FIGHTING);

    expect(result.current).toEqual(FIGHTING);
  });
});
