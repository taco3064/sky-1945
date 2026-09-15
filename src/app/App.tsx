import { useState } from 'react';
import { LoadoutScreen } from '~app/loadout/LoadoutScreen';
import { DEFAULT_SPEED_POINTS } from '~app/loadout/models/allocation';
import { Stage } from '~app/stage/Stage';
import { TitleScreen } from '~app/title/TitleScreen';

type Screen = 'title' | 'loadout' | 'stage';

/** The screen flow (game-spec 5). The stage covers playing, paused and game over. */
function App() {
  const [screen, setScreen] = useState<Screen>('title');
  // Survives returning to the title; only a reload resets it.
  const [speedPoints, setSpeedPoints] = useState(DEFAULT_SPEED_POINTS);

  if (screen === 'title') {
    return <TitleScreen onContinue={() => setScreen('loadout')} />;
  }

  if (screen === 'loadout') {
    return (
      <LoadoutScreen
        speedPoints={speedPoints}
        onSpeedPointsChange={setSpeedPoints}
        onStart={() => setScreen('stage')}
      />
    );
  }

  return <Stage speedPoints={speedPoints} onQuit={() => setScreen('title')} />;
}

export default App;
