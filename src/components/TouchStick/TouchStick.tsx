import type { RefObject } from 'react';

import styles from './styles.module.css';

export interface TouchStickProps {
  /** Handed to `usePlayerInput`, which positions and hides this through CSS. */
  ref: RefObject<HTMLDivElement | null>;
}

/** The on-screen stick: a ring where the thumb landed, and a dot that follows it. */
export function TouchStick({ ref }: TouchStickProps) {
  return (
    <div ref={ref} className={styles.stick}>
      <div className={styles.knob} />
    </div>
  );
}
