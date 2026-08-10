import { useEffect, useRef } from 'react';

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

/** Space rolls, Escape pauses. */
const ROLL_KEY = ' ';
const PAUSE_KEY = 'Escape';

function bindKeyboard(world: World, onPause: () => void): () => void {
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
    if (event.key === ROLL_KEY) {
      event.preventDefault();
      world.roll();

      return;
    }

    if (event.key === PAUSE_KEY) {
      onPause();

      return;
    }

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
}

/**
 * The keyboard half of the player's controls: arrows steer, Space rolls,
 * Escape pauses.
 *
 * Kept beside the pointer half rather than in a hook of its own outside this
 * module: "tell me where the player wants to go" is one responsibility with
 * two implementations, and the engine cannot tell which one produced the
 * vector it receives.
 *
 * `onPause` is held in a ref rather than listed as a dependency — callers
 * pass an inline arrow, and depending on it would rebind three window
 * listeners on every render.
 */
export function useKeyboardControls(world: World, onPause: () => void): void {
  const latestPause = useRef(onPause);

  useEffect(() => {
    latestPause.current = onPause;
  });

  useEffect(() => bindKeyboard(world, () => latestPause.current()), [world]);
}
