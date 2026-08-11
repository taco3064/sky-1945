import styles from './styles.module.css';
import type { TouchStickProps } from './types';

/** The on-screen stick: a ring where the thumb landed, and a dot that follows it. */
export default function TouchStick({ ref }: TouchStickProps) {
  return (
    <div ref={ref} className={styles.stick}>
      <div className={styles.knob} />
    </div>
  );
}
