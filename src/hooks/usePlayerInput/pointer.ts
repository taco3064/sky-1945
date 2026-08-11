import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

import type { World } from '~app/engine/world';

/** The filled knob's radius, in screen pixels. Mirrors the TouchStick's CSS. */
const KNOB_RADIUS = 22;

/** The ring's radius, which is also the whole throw. The knob's centre reaches it. */
const RING_RADIUS = Math.round(KNOB_RADIUS * 1.2);

/** How far a thumb may wander before it counts as a direction. Absolute, not a ratio. */
const DEADZONE_PX = 5;

/** A press shorter than this, that stayed inside the deadzone, was a tap. */
const TAP_MS = 200;

interface Origin {
  pointerId: number;
  x: number;
  y: number;
  at: number;
  moved: number;
}

function bindPointer(surface: HTMLElement, stick: HTMLElement, world: World): () => void {
  let origin: Origin | null = null;

  const paint = (dx: number, dy: number, shown: boolean): void => {
    const distance = Math.hypot(dx, dy);
    const capped = distance > RING_RADIUS ? RING_RADIUS / distance : 1;

    stick.style.setProperty('--knob-x', `${dx * capped}px`);
    stick.style.setProperty('--knob-y', `${dy * capped}px`);
    stick.style.opacity = shown ? '1' : '0';
  };

  const onDown = (event: PointerEvent): void => {
    if (origin) {
      // Somebody's other finger. That is the roll, and it fires on contact.
      world.roll();

      return;
    }

    origin = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      at: event.timeStamp,
      moved: 0,
    };

    surface.setPointerCapture(event.pointerId);
    stick.style.setProperty('--stick-x', `${event.clientX}px`);
    stick.style.setProperty('--stick-y', `${event.clientY}px`);
    paint(0, 0, true);
  };

  const onMove = (event: PointerEvent): void => {
    if (origin?.pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - origin.x;
    const dy = event.clientY - origin.y;
    const distance = Math.hypot(dx, dy);

    origin.moved = Math.max(origin.moved, distance);
    paint(dx, dy, true);

    if (distance < DEADZONE_PX) {
      world.setPlayerDirection(0, 0);

      return;
    }

    world.setPlayerDirection(dx, dy);
  };

  const onUp = (event: PointerEvent): void => {
    if (origin?.pointerId !== event.pointerId) {
      return;
    }

    // Brief and inside the deadzone was a tap, not a steer — the one-handed roll.
    if (event.timeStamp - origin.at < TAP_MS && origin.moved < DEADZONE_PX) {
      world.roll();
    }

    origin = null;
    world.setPlayerDirection(0, 0);
    paint(0, 0, false);
  };

  surface.addEventListener('pointerdown', onDown);
  surface.addEventListener('pointermove', onMove);
  surface.addEventListener('pointerup', onUp);
  surface.addEventListener('pointercancel', onUp);

  return () => {
    surface.removeEventListener('pointerdown', onDown);
    surface.removeEventListener('pointermove', onMove);
    surface.removeEventListener('pointerup', onUp);
    surface.removeEventListener('pointercancel', onUp);
    world.setPlayerDirection(0, 0);
  };
}

export interface PointerControls {
  /** Attach to the element that should catch touches — the whole viewport. */
  surface: RefObject<HTMLDivElement | null>;
  /** Attach to the on-screen stick. It positions and hides itself. */
  stick: RefObject<HTMLDivElement | null>;
}

/** The touch half of the controls: first finger steers, a second one rolls. */
export function usePointerControls(world: World): PointerControls {
  const surface = useRef<HTMLDivElement>(null);
  const stick = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const surfaceElement = surface.current;
    const stickElement = stick.current;

    if (!surfaceElement || !stickElement) {
      return;
    }

    return bindPointer(surfaceElement, stickElement, world);
  }, [world]);

  return { surface, stick };
}
