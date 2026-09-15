import type { CSSProperties, Ref } from 'react';
import type { BossAttack, BossPose } from '~app/battle/models/boss';
import './BossCraft.css';

const PARTS = ['wing', 'arm-left', 'arm-right', 'armour', 'pod-left', 'pod-right', 'body', 'spine', 'canopy', 'core', 'muzzle'];

interface BossCraftProps {
  ref?: Ref<HTMLDivElement>;
  /** The rolled size `s`. */
  size: number;
  pose: BossPose;
  /** Absent while entering. */
  move: BossAttack | null;
}

/** The boss, drawn nose-up at size 1 and scaled by `s` (game-spec 9.7). `ref` is the placed mount. */
export function BossCraft({ ref, size, pose, move }: BossCraftProps) {
  return (
    <div
      ref={ref}
      className="boss"
      data-pose={pose}
      data-move={move ?? undefined}
      style={{ '--boss-scale': size } as CSSProperties}
    >
      <div className="boss__charge" />
      <div className="boss__craft">
        {PARTS.map((part) => (
          <div key={part} className={`boss__${part}`} />
        ))}
      </div>
    </div>
  );
}
