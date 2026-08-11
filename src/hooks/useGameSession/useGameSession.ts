import { useCallback, useState } from 'react';

import { INITIAL_SESSION, nextSession } from '~app/engine/session';
import type { SessionEvent, SessionState } from '~app/engine/session';

import type { GameSession } from './types';

/** Holds the session machine for React. The transition rules stay in the engine. */
export function useGameSession(): GameSession {
  const [state, setState] = useState<SessionState>(INITIAL_SESSION);

  const send = useCallback((event: SessionEvent) => {
    setState((current) => nextSession(current, event));
  }, []);

  return { state, send };
}
