import type { SessionEvent, SessionState } from '~app/engine/session';

export interface GameSession {
  /** Which screen the run is on. */
  state: SessionState;
  /** Apply an event. One the current state refuses is a no-op. */
  send: (event: SessionEvent) => void;
}
