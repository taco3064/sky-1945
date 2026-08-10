import type { RefObject } from 'react';

import styles from './styles.module.css';

export interface TouchStickProps {
  /**
   * Handed to `usePlayerInput`, which positions and hides this entirely
   * through CSS custom properties — a dragged thumb moves at pointer-event
   * rate, which is not something to re-render for.
   */
  ref: RefObject<HTMLDivElement | null>;
}

/**
 * The on-screen stick: a ring where the thumb landed, and a filled dot that
 * follows it.
 *
 * It reports nothing and decides nothing — it is the visible half of a
 * gesture the hook is already handling. Hidden until a touch lands.
 */
export function TouchStick({ ref }: TouchStickProps) {
  return (
    <div ref={ref} className={styles.stick}>
      <div className={styles.knob} />
    </div>
  );
}
