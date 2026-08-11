import { useAnyKey } from '~app/hooks/useAnyKey';

import logo from './logo.webp';
import styles from './styles.module.css';

export interface TitleScreenProps {
  /** Leaves the title for the loadout screen. */
  onStart: () => void;
}

/**
 * The opening screen. Any key or a tap anywhere starts the run.
 *
 * The whole screen is the target rather than a button: on a phone the player
 * is holding the device to play, not to aim at a control.
 */
export function TitleScreen({ onStart }: TitleScreenProps) {
  useAnyKey(onStart);

  return (
    <div className={styles.screen} onPointerDown={onStart}>
      {/*
        The heading stays a heading — the artwork replaces its text node, not
        the element. `alt` carries the name that used to be that text, so the
        document outline and the accessibility tree both survive the swap.
      */}
      <h1 className={styles.title}>
        <img className={styles.logo} src={logo} alt="SKY-1945" />
      </h1>
      <p className={styles.prompt}>
        {/*
          Which line shows is a CSS decision, not a JS one — no user-agent
          sniffing, no touch-capability state to get wrong on a laptop with a
          touchscreen. Both are in the DOM; the media query hides one.
        */}
        <span className={styles.forKeyboard}>PRESS ANY KEY</span>
        <span className={styles.forTouch}>TAP TO START</span>
      </p>
    </div>
  );
}
