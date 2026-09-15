import type { SessionEvent, SessionState } from './types';

/** The whole machine. A state's absent event is a refused event. */
const TRANSITIONS: Record<SessionState, Partial<Record<SessionEvent, SessionState>>> = {
  title: { start: 'loadout' },
  loadout: { confirm: 'playing' },
  playing: { pause: 'paused', die: 'gameover' },
  // `abort` is the only way out of a run before lives reach zero: see #6.
  paused: { resume: 'playing', abort: 'title' },
  gameover: { reset: 'title' },
};

/** Where a run begins. */
export const INITIAL_SESSION: SessionState = 'title';

/** Apply an event. An unaccepted event returns the state unchanged, never throws. */
export function nextSession(state: SessionState, event: SessionEvent): SessionState {
  return TRANSITIONS[state][event] ?? state;
}
