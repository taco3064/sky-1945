import type { Placement } from '~app/battle/models/simulation';
import { formatLean, formatRadius, nextLean, placementTransform } from './placement';

interface PlacementEntry {
  element: HTMLElement;
  lean: number;
  /** x at the previous displayed frame; null before the first. */
  previousX: number | null;
}

export interface PlacementRegistry {
  /** Tracks an entity's outer element, or forgets it when `element` is null. */
  register(id: number, element: HTMLElement | null): void;
  /**
   * Writes one displayed frame of an entity's transform and `--lean` (game-spec 8.4),
   * and `--radius` for an entity that has one.
   */
  place(placement: Placement): void;
}

export function createPlacementRegistry(): PlacementRegistry {
  const entries = new Map<number, PlacementEntry>();

  return {
    register(id, element) {
      if (element) {
        entries.set(id, { element, lean: 0, previousX: null });
      } else {
        entries.delete(id);
      }
    },
    place({ id, x, y, angle, radius }) {
      const entry = entries.get(id);

      if (!entry) {
        return;
      }

      const slide = entry.previousX === null ? 0 : x - entry.previousX;

      entry.lean = nextLean(entry.lean, slide);
      entry.previousX = x;
      entry.element.style.transform = placementTransform(x, y, angle);
      entry.element.style.setProperty('--lean', formatLean(entry.lean));

      if (radius !== undefined) {
        entry.element.style.setProperty('--radius', formatRadius(radius));
      }
    },
  };
}
