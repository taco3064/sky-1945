import type { RefObject } from 'react';

export interface Origin {
  pointerId: number;
  x: number;
  y: number;
  at: number;
  moved: number;
}

export interface PointerControls {
  /** Attach to the element that should catch touches — the whole viewport. */
  surface: RefObject<HTMLDivElement | null>;
  /** Attach to the on-screen stick. It positions and hides itself. */
  stick: RefObject<HTMLDivElement | null>;
}

export type PlayerControls = PointerControls;
