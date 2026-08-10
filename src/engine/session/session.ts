/**
 * The whole-run state machine — which screen the run is on, and what moves it
 * between them. Pure TS: no React, no physics, no DOM.
 *
 * Rounds are deliberately absent. Clearing a boss and starting round 2 does
 * not change the screen, so it is not a session concern — it belongs to the
 * round state that arrives with the director (#7).
 */

/** Every screen a run can be on. */
export type SessionState = 'title' | 'loadout' | 'playing' | 'paused' | 'gameover';

/** Everything that can move a run between screens. */
export type SessionEvent
  = | 'start'
    | 'confirm'
    | 'pause'
    | 'resume'
    | 'abort'
    | 'die'
    | 'reset';

/**
 * The whole machine. A state's absent event is a refused event — there is no
 * second list of illegal pairs to keep in sync with this one.
 */
const TRANSITIONS: Record<SessionState, Partial<Record<SessionEvent, SessionState>>> = {
  title: { start: 'loadout' },
  loadout: { confirm: 'playing' },
  playing: { pause: 'paused', die: 'gameover' },
  // `abort` is the only way out of a run before it ends. Without it the
  // player is stuck: the run has no other exit until lives reach zero (#6),
  // and a game you cannot leave is not paused, it is trapped.
  paused: { resume: 'playing', abort: 'title' },
  gameover: { reset: 'title' },
};

/** Where a run begins. */
export const INITIAL_SESSION: SessionState = 'title';

/**
 * Apply an event.
 *
 * An event the current state does not accept returns that state unchanged
 * rather than throwing. The callers are key handlers and pointer handlers —
 * a stray keypress during a screen transition is ordinary, and a machine that
 * threw on one would turn a mistimed keystroke into a crashed run.
 */
export function nextSession(state: SessionState, event: SessionEvent): SessionState {
  return TRANSITIONS[state][event] ?? state;
}
