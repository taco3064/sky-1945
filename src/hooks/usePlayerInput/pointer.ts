import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

import type { World } from '~app/engine/world';

/**
 * The filled knob's radius, in screen pixels. Mirrors the TouchStick's CSS.
 *
 * Two places, deliberately: `components` cannot import from `hooks`, so the
 * drawing and the gesture cannot share a constant. What keeps them honest is that
 * the ring's radius is knob + throw, so a mismatch is immediately visible — the
 * knob either escapes the ring or never reaches it.
 */
const KNOB_RADIUS = 22;

/**
 * The ring's radius, which is also the whole throw.
 *
 * Reported twice from play on a phone: turning the aircraft took a large,
 * deliberate thumb movement, which is the wrong shape of effort for a game where
 * the answer to a bullet is a twitch. The first attempt shortened the throw but
 * left the ring at its old size, which fixed the effort and not the picture.
 *
 * So the ring shrank to 1.2 knob radii, and the knob's *centre* travels to its
 * edge — meaning most of the dot sits outside the ring at full deflection. That is
 * the intent rather than an overflow: the ring is a gate the thumb presses against,
 * not a cup the dot rattles inside. Full deflection is now 26px of thumb, down
 * from 56.
 */
const RING_RADIUS = Math.round(KNOB_RADIUS * 1.2);

/**
 * How far a thumb may wander before it counts as a direction, in pixels.
 *
 * Absolute rather than a fraction of the throw. It answers to the hand — how still
 * a thumb rests, and how much a screen jitters — not to how far the stick happens
 * to travel. Kept as a fraction it would have shrunk along with the throw above,
 * and five pixels of a 26px throw is already a fifth of it.
 */
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

    /*
     * A press that was brief and never left the deadzone was a tap, not a steer —
     * the one-handed way to roll.
     *
     * Measured against the deadzone rather than a slop of its own. There used to be
     * a separate 12px threshold, which was two numbers for one idea: a movement too
     * small to be a direction is exactly a movement small enough to be a tap. One
     * constant cannot disagree with itself.
     */
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

/**
 * The touch half of the player's controls.
 *
 * The two gestures are told apart by **which finger**, never by how long one
 * is held. A long-press-versus-tap split needs a 150–200ms threshold to
 * disambiguate, which buys a 150ms lag on either movement or the dodge — and
 * movement lag is fatal in a bullet-hell game. Distinguishing by finger costs
 * nothing, and is what multi-touch is for.
 *
 * - first touch → the stick appears where it landed; movement starts on
 *   contact, with no delay at all
 * - a second touch while the first is held → roll
 * - a quick tap with nothing else down → also a roll, so one-handed play can
 *   still dodge
 *
 * The stick reports **direction only**. Offset distance does not scale speed:
 * speed already belongs to the loadout, and letting the stick scale it too
 * would put two systems in charge of one number.
 */
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
