import { useEffect, useRef } from 'react';

/** Runs `onPress` on any keydown while mounted. Held in a ref, not a dependency. */
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
