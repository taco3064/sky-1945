import { useState } from 'react'
import { DEFAULT_SPEED_POINTS } from './game/loadout.ts'
import { LoadoutScreen } from './screens/LoadoutScreen.tsx'
import { TitleScreen } from './screens/TitleScreen.tsx'

type Screen = 'title' | 'loadout'

export default function App() {
  const [screen, setScreen] = useState<Screen>('title')
  // Lives here so the allocation survives returning to the title; only a reload resets it.
  const [speedPoints, setSpeedPoints] = useState(DEFAULT_SPEED_POINTS)

  switch (screen) {
    case 'title':
      return <TitleScreen onProceed={() => setScreen('loadout')} />
    case 'loadout':
      return <LoadoutScreen speedPoints={speedPoints} onChange={setSpeedPoints} onStart={() => {}} />
  }
}
