import { TitleScreen } from './screens/TitleScreen.tsx'

function proceed() {}

export default function App() {
  return <TitleScreen onProceed={proceed} />
}
