import { type PointerEvent, useRef } from 'react';
import { type Direction, type Steering, isTap, moveSteering, startSteering } from '~app/stage/models/controls';

interface PointerHandlers {
  onSteer: (direction: Direction) => void;
  onRoll: () => void;
}

export interface PointerSteering {
  /** Attach to the touch stick ring. */
  stickRef: React.RefObject<HTMLDivElement | null>;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
}

const ACTIVE = 'touch-stick--active';

/** Pointer input on the touch surface, driving the touch stick (game-spec 8.8, 12.4). */
export function usePointerSteering({ onSteer, onRoll }: PointerHandlers): PointerSteering {
  const stickRef = useRef<HTMLDivElement>(null);
  const steering = useRef<Steering | null>(null);

  const setKnob = (x: number, y: number) => {
    stickRef.current?.style.setProperty('--knob-x', `${x}px`);
    stickRef.current?.style.setProperty('--knob-y', `${y}px`);
  };

  const release = (event: PointerEvent<HTMLElement>) => {
    const current = steering.current;

    if (current?.pointerId !== event.pointerId) {
      return;
    }

    steering.current = null;

    if (isTap(current, performance.now())) {
      onRoll();
    }

    onSteer({ x: 0, y: 0 });
    setKnob(0, 0);
    stickRef.current?.classList.remove(ACTIVE);
  };

  return {
    stickRef,
    onPointerDown(event) {
      if (steering.current) {
        onRoll();

        return;
      }

      steering.current = startSteering(event.pointerId, event.clientX, event.clientY, performance.now());
      event.currentTarget.setPointerCapture(event.pointerId);
      stickRef.current?.style.setProperty('--stick-x', `${event.clientX}px`);
      stickRef.current?.style.setProperty('--stick-y', `${event.clientY}px`);
      setKnob(0, 0);
      stickRef.current?.classList.add(ACTIVE);
    },
    onPointerMove(event) {
      const current = steering.current;

      if (current?.pointerId !== event.pointerId) {
        return;
      }

      const { direction, knob } = moveSteering(current, event.clientX, event.clientY);

      onSteer(direction);
      setKnob(knob.x, knob.y);
    },
    onPointerUp: release,
    onPointerCancel: release,
  };
}
