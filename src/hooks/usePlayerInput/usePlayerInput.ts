import { useEffect } from 'react';

import type { Vector2, World } from '~app/engine/world';

/**
 * Which key means which way. The engine normalises the sum, so pressing two
 * of them is a diagonal rather than a 41%-faster dash.
 */
const DIRECTIONS: Readonly<Record<string, Vector2>> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

/**
 * Steers the player from the keyboard, and returns nothing.
 *
 * The direction never becomes React state. A held key is a fact about the
 * keyboard, and the only thing that needs it is the simulation — routing it
 * through a render would re-render the stage on every key event to deliver a
 * number React itself has no use for.
 *
 * Touch — the on-screen stick, and the second finger for the roll — arrives
 * in #5. What lands here is the shape both sources feed: a unit vector, and
 * the engine cannot tell which one produced it.
 */
export function usePlayerInput(world: World): void {
  useEffect(() => {
    const held = new Set<string>();

    const publish = (): void => {
      let x = 0;
      let y = 0;

      for (const key of held) {
        x += DIRECTIONS[key].x;
        y += DIRECTIONS[key].y;
      }

      world.setPlayerDirection(x, y);
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      if (!Object.hasOwn(DIRECTIONS, event.key)) {
        return;
      }

      event.preventDefault();
      held.add(event.key);
      publish();
    };

    const onKeyUp = (event: KeyboardEvent): void => {
      if (held.delete(event.key)) {
        publish();
      }
    };

    // A key held while the window loses focus never sends its keyup, and the
    // aircraft flies off in that direction until the player presses and
    // releases it again. Alt-tabbing mid-run is not an edge case.
    const onBlur = (): void => {
      held.clear();
      publish();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      world.setPlayerDirection(0, 0);
    };
  }, [world]);
}
