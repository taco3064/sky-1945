import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

import { FIELD_HEIGHT, FIELD_WIDTH } from '~app/engine/field';

/**
 * Fits the fixed field to whatever screen it lands on, by writing a CSS
 * custom property rather than returning a number.
 *
 * Returning the scale would re-render the stage on every resize, and a phone
 * rotating or a browser chrome sliding away is a resize. The property is read
 * by a `transform: scale()` in CSS, so the fit costs one style write and no
 * render at all — and none of it is in the frame loop, since a resize happens
 * when the window changes, not sixty times a second.
 *
 * The field's own numbers never move: the simulation is 540 × 960 on every
 * device, because a wider field would be an easier field.
 */
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
