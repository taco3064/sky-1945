import { vi } from 'vitest';

import type { World } from '~app/engine/world';

/**
 * A `World` that does nothing until a test tells it to.
 *
 * Every hook that talks to the engine needs one of these, and for eight files it
 * was eight identical copies — so adding `subscribeBoss` to the interface meant
 * editing all eight in one commit, and `ready` meant doing it again. That is the
 * cost this file removes: the shape is declared once, and a new channel is one
 * line rather than eight.
 *
 * `overrides` is how a test says what it actually cares about. The default is inert
 * on purpose — every subscription hands back a working unsubscribe and never fires,
 * so a test that overrides one channel is not quietly driven by the other nine.
 *
 * ## Why this folder needs a config line
 *
 * `src/fixtures/` matches no layer glob, so blueprint would call it an undeclared
 * folder. The fix is not a new layer: test support is not architecture, and
 * declaring one would put it in the flow chain, the handbook's layer table and the
 * agent contract — then turn the fixture ban on this file itself, telling a stub it
 * must not import stubs.
 *
 * Instead `architecture.testFiles` now counts `*.fixtures.ts` as a test file. The
 * exemption is **per file**: anything in here that does not match that name makes
 * the folder an undeclared layer again and `blueprint inspect` goes red. That is a
 * feature — a production file in this folder *should* raise the layer question.
 *
 * The other half of the bargain is that `~app/fixtures*` is banned from production
 * code, which is the gate this whole arrangement buys. Nothing lints this folder
 * either (no layer glob reaches it), so keep it to the one concern.
 */
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
