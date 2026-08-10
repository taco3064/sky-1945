import { LoadoutScreen } from '~app/containers/LoadoutScreen';
import { TitleScreen } from '~app/containers/TitleScreen';
import { useGameSession } from '~app/hooks/useGameSession';
import { useLoadout } from '~app/hooks/useLoadout';

/**
 * The one page. It holds the run's state and picks the screen for it — which
 * is this project's routing, and routing is what the pages layer is for.
 *
 * It assembles containers and nothing else: no game logic, no components
 * stacked directly. Each screen owns its own subtree from there, including
 * any provider it needs — containers may mount one, and pages may not.
 *
 * The loadout is held here rather than on the loadout screen because it
 * outlives that screen: the player confirms, the screen goes, and the
 * allocation stays in force for the rest of the run (#4 reads the speed
 * boost from it).
 */
export function Game() {
  const { state, send } = useGameSession();
  const { speedPoints, setSpeedPoints, adjustSpeedPoints } = useLoadout();

  if (state === 'title') {
    return <TitleScreen onStart={() => send('start')} />;
  }

  if (state === 'loadout') {
    return (
      <LoadoutScreen
        speedPoints={speedPoints}
        onPoints={setSpeedPoints}
        onAdjust={adjustSpeedPoints}
        onConfirm={() => send('confirm')}
      />
    );
  }

  // #4 adds the stage. The machine already knows every transition
  // (engine/session); the screens are what is missing.
  return null;
}
