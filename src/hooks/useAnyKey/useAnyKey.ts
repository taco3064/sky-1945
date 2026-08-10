import { useEffect, useRef } from 'react';

/**
 * Runs `onPress` on any keydown while mounted, and unbinds itself on unmount.
 *
 * The caller passes a callback and receives nothing back — no handler to wire
 * into an effect of its own, no listener to remember to remove. Lifecycle is
 * part of the job, so it is built in.
 *
 * The callback is held in a ref rather than listed as an effect dependency:
 * an inline arrow (which is how every caller writes it) is a new function
 * every render, and depending on it would tear down and rebind the listener
 * on each one.
 */
export function useAnyKey(onPress: () => void): void {
  const latest = useRef(onPress);

  useEffect(() => {
    latest.current = onPress;
  });

  useEffect(() => {
    const handler = (): void => latest.current();

    window.addEventListener('keydown', handler);

    return () => window.removeEventListener('keydown', handler);
  }, []);
}
