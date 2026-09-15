import type { ReactNode } from 'react';

import type { World } from '~app/engine/world';

export interface GameProviderProps {
  /** The running world. Mounted by the container that created it. */
  world: World;
  children: ReactNode;
}
