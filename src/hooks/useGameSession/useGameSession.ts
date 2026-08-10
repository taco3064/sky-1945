import { useCallback, useState } from 'react';

import { INITIAL_SESSION, nextSession } from '~app/engine/session';
import type { SessionEvent, SessionState } from '~app/engine/session';

export interface GameSession {
  /** Which screen the run is on. */
  state: SessionState;
  /** Apply an event. One the current state refuses is a no-op. */
  send: (event: SessionEvent) => void;
}

/**
 * Holds the session machine for React.
 *
 * The transition rules stay in the engine — this hook owns nothing but the
 * current state and the way to advance it. Screen changes run at human speed,
 * so React state is the right home; nothing here is in the frame loop.
 */
export function useGameSession(): GameSession {
  const [state, setState] = useState<SessionState>(INITIAL_SESSION);

  const send = useCallback((event: SessionEvent) => {
    setState((current) => nextSession(current, event));
  }, []);

  return { state, send };
}
