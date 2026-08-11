import { vi } from 'vitest';

import type { World } from '~app/engine/world';

/** A `World` that does nothing until a test overrides a channel: see #27. */
export function stubWorld(overrides: Partial<World> = {}): World {
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
    subscribeFrameRate: vi.fn(() => () => {}),
    setPlayerDirection: vi.fn(),
    roll: vi.fn(),
    ...overrides,
  };
}
