import type { RefObject } from 'react';

export interface TouchStickProps {
  /** Handed to `usePlayerInput`, which positions and hides this through CSS. */
  ref: RefObject<HTMLDivElement | null>;
}
