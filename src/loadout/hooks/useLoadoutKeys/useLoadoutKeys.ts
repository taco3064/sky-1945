import { useEffect } from 'react';

interface LoadoutKeyHandlers {
  /** Called with −1 for ArrowLeft and +1 for ArrowRight. */
  onStep: (delta: -1 | 1) => void;
  onStart: () => void;
}

/** Keyboard input of the loadout screen (game-spec 7.6). */
export function useLoadoutKeys({ onStep, onStart }: LoadoutKeyHandlers): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onStep(-1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        onStep(1);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        onStart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStep, onStart]);
}
