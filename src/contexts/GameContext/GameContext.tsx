import { createContext } from 'react';
import type { ReactNode } from 'react';

import type { World } from '~app/engine/world';

/** Carries the running simulation down. Only a hook may read it — see the handbook. */
// eslint-disable-next-line react-refresh/only-export-components -- one module entry
export const GameContext = createContext<World | null>(null);

export interface GameProviderProps {
  /** The running world. Mounted by the container that created it. */
  world: World;
  children: ReactNode;
}

export function GameProvider({ world, children }: GameProviderProps) {
  return <GameContext value={world}>{children}</GameContext>;
}
