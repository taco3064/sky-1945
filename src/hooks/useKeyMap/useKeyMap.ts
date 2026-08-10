import { useEffect, useRef } from 'react';

/** Keyboard `event.key` values mapped to what they do. */
export type KeyHandlers = Readonly<Record<string, () => void>>;

/**
 * Binds a set of keys for as long as the component is mounted.
 *
 * Global rather than attached to an element on purpose: a game screen should
 * not require the player to focus a control first. Arrow keys work the moment
 * the screen appears, whether or not anything was clicked.
 *
 * A handled key has its default prevented — arrows scroll the page otherwise,
 * and a scrolling page under a game screen is never what was meant. Unhandled
 * keys are left entirely alone.
 *
 * Same ref as `useAnyKey` and for the same reason: callers pass an object
 * literal of inline arrows, so depending on it would rebind every render.
 */
export function useKeyMap(handlers: KeyHandlers): void {
  const latest = useRef(handlers);

  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const handlers = latest.current;

      // hasOwn, not a plain lookup: `handlers[event.key]` walks the
      // prototype, so a key named `constructor` or `toString` would find a
      // function there, pass a truthiness check, and get called. `event.key`
      // is a string from outside this codebase — it does not get to reach
      // Object.prototype.
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
