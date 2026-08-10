import type { World } from '~app/engine/world';

import { useKeyboardControls } from './keyboard';
import { usePointerControls } from './pointer';
import type { PointerControls } from './pointer';

export type PlayerControls = PointerControls;

/**
 * Everything the player can express, from either input, reduced to three
 * things the engine understands: a unit direction, a roll, and a pause.
 *
 * Keyboard produces an 8-way unit vector, touch a 360° one, and the engine
 * cannot tell which arrived. Direction comes from the player, speed comes
 * from the loadout — they never argue over the same number.
 *
 * None of it becomes React state. A held key or a dragged thumb is a fact
 * about the input device, and the only thing that needs it is the simulation;
 * routing it through a render would re-render the stage on every input event
 * to deliver a number React itself has no use for. The stick's own position
 * is written the same way, straight to CSS custom properties.
 */
export function usePlayerInput(world: World, onPause: () => void): PlayerControls {
  useKeyboardControls(world, onPause);

  return usePointerControls(world);
}
