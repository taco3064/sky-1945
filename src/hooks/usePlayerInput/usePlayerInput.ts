import type { World } from '~app/engine/world';

import { useKeyboardControls } from './keyboard';
import { usePointerControls } from './pointer';
import type { PointerControls } from './pointer';

export type PlayerControls = PointerControls;

/** Both inputs, reduced to what the engine understands: direction, roll, pause. */
export function usePlayerInput(world: World, onPause: () => void): PlayerControls {
  useKeyboardControls(world, onPause);

  return usePointerControls(world);
}
