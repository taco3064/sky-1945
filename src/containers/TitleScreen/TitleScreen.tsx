import { useAnyKey } from '~app/hooks/useAnyKey';

import logo from './logo.webp';
import styles from './styles.module.css';
import type { TitleScreenProps } from './types';

/** The opening screen. Any key or a tap anywhere starts the run. */
export default function TitleScreen({ onStart }: TitleScreenProps) {
  useAnyKey(onStart);

  return (
    <div className={styles.screen} onPointerDown={onStart}>
      {/* The artwork replaces the heading's text node; `alt` carries the name. */}
      <h1 className={styles.title}>
        <img className={styles.logo} src={logo} alt="SKY-1945" />
      </h1>
      <p className={styles.prompt}>
        {/* Both are in the DOM; a media query hides one. No UA sniffing. */}
        <span className={styles.forKeyboard}>PRESS ANY KEY</span>
        <span className={styles.forTouch}>TAP TO START</span>
      </p>
    </div>
  );
}
