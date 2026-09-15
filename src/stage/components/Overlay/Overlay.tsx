import './Overlay.css'

export interface OverlayAction {
  label: string
  onClick: () => void
}

interface OverlayProps {
  title: string
  /** The round reached, shown under the title when given. */
  reached?: number
  actions: OverlayAction[]
}

/** The paused and game-over overlays (game-spec 8.7). */
export function Overlay({ title, reached, actions }: OverlayProps) {
  return (
    <div className="overlay">
      <p className="overlay__title">{title}</p>
      {reached !== undefined && <p className="overlay__reached">{`REACHED ROUND ${reached}`}</p>}
      <div className="overlay__actions">
        {actions.map(({ label, onClick }) => (
          <button key={label} className="overlay__action" type="button" onClick={onClick}>
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
