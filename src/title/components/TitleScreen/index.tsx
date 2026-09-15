import { useAnyKeyDown } from '~app/title/hooks/useAnyKeyDown'
import './TitleScreen.css'

interface TitleScreenProps {
  onContinue: () => void
}

export function TitleScreen({ onContinue }: TitleScreenProps) {
  useAnyKeyDown(onContinue)

  return (
    <div className="title" onPointerDown={onContinue}>
      <h1 className="title__heading">
        <img className="title__logo" src={`${import.meta.env.BASE_URL}logo.webp`} alt="SKY-1945" />
      </h1>
      <p className="title__prompt">
        <span className="title__key">PRESS ANY KEY</span>
        <span className="title__tap">TAP TO START</span>
      </p>
    </div>
  )
}
