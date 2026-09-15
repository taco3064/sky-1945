import { useState } from 'react'
import { TitleScreen } from '~app/title/components/TitleScreen'

type Screen = 'title' | 'loadout'

function App() {
  const [screen, setScreen] = useState<Screen>('title')

  if (screen === 'title') {
    return <TitleScreen onContinue={() => setScreen('loadout')} />
  }

  return null
}

export default App
