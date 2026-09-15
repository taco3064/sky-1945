import './Overlay.css'

type OverlayProps =
  | { kind: 'paused'; onResume: () => void; onQuit: () => void }
  | { kind: 'gameover'; round: number; onTitle: () => void }

export function Overlay(props: OverlayProps) {
  return (
    <div className="overlay">
      {props.kind === 'paused' ? (
        <>
          <p className="overlay-title">PAUSED</p>
          <div className="overlay-actions">
            <button className="overlay-action" type="button" onClick={props.onResume}>
              RESUME
            </button>
            <button className="overlay-action" type="button" onClick={props.onQuit}>
              QUIT
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="overlay-title">GAME OVER</p>
          <p className="overlay-reached">REACHED ROUND {props.round}</p>
          <div className="overlay-actions">
            <button className="overlay-action" type="button" onClick={props.onTitle}>
              TITLE
            </button>
          </div>
        </>
      )}
    </div>
  )
}
