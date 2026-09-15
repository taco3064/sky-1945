import { useEffect, useRef } from 'react';
import { type Direction, arrowDirection, isArrowKey } from '~app/stage/models/controls';

interface KeyboardHandlers {
  onSteer: (direction: Direction) => void;
  onRoll: () => void;
  onPause: () => void;
}

/** Keyboard input on the stage (game-spec 12.4). Auto-repeat is not filtered. */
export function useKeyboardControls({
  onSteer,
  onRoll,
  onPause,
}: KeyboardHandlers): void {
  const held = useRef(new Set<string>());

  useEffect(() => {
    const keys = held.current;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isArrowKey(event.key)) {
        event.preventDefault();
        keys.add(event.key);
        onSteer(arrowDirection(keys));
      } else if (event.key === ' ') {
        event.preventDefault();
        onRoll();
      } else if (event.key === 'Escape') {
        onPause();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (isArrowKey(event.key)) {
        event.preventDefault();
        keys.delete(event.key);
        onSteer(arrowDirection(keys));
      }
    };

    const handleBlur = () => {
      keys.clear();
      onSteer({ x: 0, y: 0 });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [onSteer, onRoll, onPause]);
}
