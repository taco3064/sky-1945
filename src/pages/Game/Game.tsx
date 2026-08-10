import { TitleScreen } from '~app/containers/TitleScreen';
import { useGameSession } from '~app/hooks/useGameSession';

/**
 * The one page. It holds the session and picks the screen for it — which is
 * this project's routing, and routing is what the pages layer is for.
 *
 * It assembles containers and nothing else: no game logic, no components
 * stacked directly. Each screen owns its own subtree from there, including
 * any provider it needs — containers may mount one, and pages may not.
 */
export function Game() {
  const { state, send } = useGameSession();

  // #3 adds the loadout screen and #4 the stage. The machine already knows
  // every transition (engine/session); the screens are what is missing, so
  // the states past `title` render nothing yet.
  if (state === 'title') {
    return <TitleScreen onStart={() => send('start')} />;
  }

  return null;
}
