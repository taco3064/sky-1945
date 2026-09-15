import { useEffect, useRef } from 'react';

import type { KeyHandlers } from './types';

/** Binds keys globally while mounted. A handled key has its default prevented. */
export function useKeyMap(handlers: KeyHandlers): void {
  const latest = useRef(handlers);

  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const handlers = latest.current;

      // hasOwn, not a plain lookup: `event.key` must not reach Object.prototype.
      if (!Object.hasOwn(handlers, event.key)) {
        return;
      }

      event.preventDefault();
      handlers[event.key]();
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
