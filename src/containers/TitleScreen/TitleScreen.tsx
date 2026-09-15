import { useAnyKey } from '~app/hooks/useAnyKey';

import styles from './styles.module.css';
import type { TitleScreenProps } from './types';

/** The opening screen. Any key or a tap anywhere starts the run. */
export default function TitleScreen({ onStart }: TitleScreenProps) {
  useAnyKey(onStart);

  return (
    <div className={styles.screen} onPointerDown={onStart}>
      {/* The artwork replaces the heading's text node; `alt` carries the name. */}
      <h1 className={styles.title}>
        {/*
          Served from public/ rather than imported, so the README can point at
          the same file. Two things come with that. An imported asset gets a
          content hash and a build-time error on a wrong path; this gets
          neither — rename the file and the build stays green while the page
          404s. And the prefix is not optional: Pages serves this from
          /sky-1945/, Vite rewrites index.html for that base but never a string
          inside a component, so a bare "/logo.webp" resolves against the
          domain root and breaks in production only.
        */}
        <img className={styles.logo} src={`${import.meta.env.BASE_URL}logo.webp`} alt="SKY-1945" />
      </h1>
      <p className={styles.prompt}>
        {/* Both are in the DOM; a media query hides one. No UA sniffing. */}
        <span className={styles.forKeyboard}>PRESS ANY KEY</span>
        <span className={styles.forTouch}>TAP TO START</span>
      </p>
    </div>
  );
}
