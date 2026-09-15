import type { Ref } from 'react';
import type { BulletSide } from '~app/battle/models/bullets';
import './Bullet.css';

interface BulletProps {
  ref?: Ref<HTMLDivElement>;
  side: BulletSide;
}

/** A player capsule or an enemy round shot (game-spec 10.1, 10.2). `ref` is the placed element. */
export function Bullet({ ref, side }: BulletProps) {
  return <div ref={ref} className={`bullet bullet--${side}`} />;
}
