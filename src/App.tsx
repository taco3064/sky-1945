import { useState } from 'react'
import { LoadoutScreen } from '~app/loadout/components/LoadoutScreen'
import { DEFAULT_SPEED_POINTS } from '~app/loadout/lib/allocation'
import { TitleScreen } from '~app/title/components/TitleScreen'

type Screen = 'title' | 'loadout' | 'stage'

function App() {
  const [screen, setScreen] = useState<Screen>('title')
  // Survives returning to the title; only a reload resets it (game-spec 5).
  const [speedPoints, setSpeedPoints] = useState(DEFAULT_SPEED_POINTS)

  if (screen === 'title') {
    return <TitleScreen onContinue={() => setScreen('loadout')} />
  }

  if (screen === 'loadout') {
    return (
      <LoadoutScreen
        speedPoints={speedPoints}
        onSpeedPointsChange={setSpeedPoints}
        onStart={() => setScreen('stage')}
      />
    )
  }

  return null
}

export default App
