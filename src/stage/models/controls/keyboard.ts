/** A steering direction; published as is and normalised by whoever moves the aircraft. */
export interface Direction {
  x: number;
  y: number;
}

const ARROWS: Record<string, Direction> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

export function isArrowKey(key: string): boolean {
  return Object.hasOwn(ARROWS, key);
}

/** Held arrows summed into a direction; opposite keys cancel (game-spec 12.4). */
export function arrowDirection(held: Iterable<string>): Direction {
  let x = 0;
  let y = 0;

  for (const key of held) {
    x += ARROWS[key].x;
    y += ARROWS[key].y;
  }

  return { x, y };
}
