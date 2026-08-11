import GameStage from '~app/containers/GameStage';
import LoadoutScreen from '~app/containers/LoadoutScreen';
import TitleScreen from '~app/containers/TitleScreen';
import { useGameSession } from '~app/hooks/useGameSession';
import { useLoadout } from '~app/hooks/useLoadout';

/** The one page: it holds the run's state and picks the screen for it. */
export default function Game() {
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

  // `playing`, `paused` and `gameover` all render the stage, never tear it down.
  return (
    <GameStage
      speedPoints={speedPoints}
      phase={state}
      onPause={() => send(state === 'paused' ? 'resume' : 'pause')}
      onQuit={() => send(state === 'gameover' ? 'reset' : 'abort')}
      onGameOver={() => send('die')}
    />
  );
}
