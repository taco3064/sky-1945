import { createContext } from 'react';
import type { ReactNode } from 'react';

import type { World } from '~app/engine/world';

/**
 * Carries the running simulation down to whatever needs to read it.
 *
 * This layer defines and provides, and does nothing else — `useContext`
 * belongs to the hooks layer, so the reader lives there
 * (`useEntityTransform`). The split is the blueprint's, and it is what keeps
 * a component from ever holding the world: components may not import this
 * layer at all, so the only way down to the simulation is through a hook.
 */
// The template's fast-refresh rule wants the context in its own file, away
// from the provider. The blueprint's module shape says a context module
// exposes both through one entry, and the blueprint is the source of truth
// for structure (agent-contract, "When another tool disagrees"). Cost of
// ignoring the rule: one extra full reload when *this* file is edited during
// development. Cost of obeying it: a module shape that contradicts the
// contract every other module in the repo follows.
// oxlint-disable-next-line react/only-export-components
export const GameContext = createContext<World | null>(null);

export interface GameProviderProps {
  /** The running world. Mounted by the container that created it. */
  world: World;
  children: ReactNode;
}

export function GameProvider({ world, children }: GameProviderProps) {
  return <GameContext value={world}>{children}</GameContext>;
}
