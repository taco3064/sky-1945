import { createContext } from 'react';

import type { World } from '~app/engine/world';

import type { GameProviderProps } from './types';

/** Carries the running simulation down. Only a hook may read it — see the handbook. */
// eslint-disable-next-line react-refresh/only-export-components -- one module entry
export const GameContext = createContext<World | null>(null);

export function GameProvider({ world, children }: GameProviderProps) {
  return <GameContext value={world}>{children}</GameContext>;
}
