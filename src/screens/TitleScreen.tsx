import { useEffect, useEffectEvent } from 'react'
import './TitleScreen.css'

type TitleScreenProps = {
  onProceed: () => void
}

export function TitleScreen({ onProceed }: TitleScreenProps) {
  const handleKeyDown = useEffectEvent(() => onProceed())

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="title-screen" onPointerDown={onProceed}>
      <h1 className="title-heading">
        <img className="title-logo" src={`${import.meta.env.BASE_URL}logo.webp`} alt="SKY-1945" />
      </h1>
      <p className="title-prompt">
        <span className="title-prompt-key">PRESS ANY KEY</span>
        <span className="title-prompt-tap">TAP TO START</span>
      </p>
    </div>
  )
}
