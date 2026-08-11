import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

import { FIELD_HEIGHT, FIELD_WIDTH } from '~app/engine/field';

/** Fits the fixed field to the screen by writing `--stage-scale`, never by rendering. */
export function useStageScale(): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = ref.current;

    if (!viewport) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const scale = Math.min(width / FIELD_WIDTH, height / FIELD_HEIGHT);

      viewport.style.setProperty('--stage-scale', String(scale));
    });

    observer.observe(viewport);

    return () => observer.disconnect();
  }, []);

  return ref;
}
