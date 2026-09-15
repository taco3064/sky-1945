import type { Ref } from 'react'
import type { EnemyKind } from '~app/battle/models/enemies'
import './EnemyCraft.css'

/** Parts in paint order (game-spec 9.4–9.6). */
const PARTS: Record<EnemyKind, string[]> = {
  small: ['wing', 'body', 'core'],
  medium: ['wing', 'pod-left', 'pod-right', 'body', 'canopy'],
  large: ['wing', 'armour', 'pod-left', 'pod-right', 'body', 'core'],
}

interface EnemyCraftProps {
  ref?: Ref<HTMLDivElement>
  kind: EnemyKind
}

/** ENEMY-S / M / L, drawn nose-up (game-spec 9.3). `ref` is the placed mount. */
export function EnemyCraft({ ref, kind }: EnemyCraftProps) {
  return (
    <div ref={ref} className={`enemy enemy--${kind}`}>
      <div className="enemy__craft">
        {PARTS[kind].map((part) => (
          <div key={part} className={`enemy__${part}`} />
        ))}
      </div>
    </div>
  )
}
