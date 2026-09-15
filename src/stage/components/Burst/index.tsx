import type { CSSProperties, Ref } from 'react'
import type { BurstSize, BurstTone } from '~app/battle/lib/burst'
import { burstShards } from '~app/battle/lib/shards'
import './Burst.css'

interface BurstProps {
  ref?: Ref<HTMLDivElement>
  tone: BurstTone
  size: BurstSize
}

/** A wreck: a flash, then the shards (game-spec 10.4). `ref` is the placed anchor. */
export function Burst({ ref, tone, size }: BurstProps) {
  return (
    <div ref={ref} className={`burst burst--${tone} burst--${size}`}>
      <div className="burst__flash" />
      {burstShards(size).map(({ dx, dy, spin }, index) => (
        <div
          key={index}
          className="burst__shard"
          style={{ '--dx': dx, '--dy': dy, '--spin': `${spin}deg` } as CSSProperties}
        />
      ))}
    </div>
  )
}
