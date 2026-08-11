import type { Burst, EffectField } from './types';

/** How long a burst is on screen. Matches the CSS animation in components/Burst. */
export const BURST_DURATION = 0.6;

export function createEffectField(): EffectField {
  const live = new Map<number, Burst>();

  // Counts down from -1: Matter hands out positive ids, and both share a channel.
  let nextId = -1;

  return {
    burst(at, style) {
      const id = nextId;

      nextId -= 1;

      live.set(id, {
        id,
        x: at.x,
        y: at.y,
        size: style.size,
        tone: style.tone,
        remaining: BURST_DURATION,
      });
    },

    advance(elapsed) {
      const finished: number[] = [];

      for (const burst of live.values()) {
        burst.remaining -= elapsed;

        if (burst.remaining <= 0) {
          finished.push(burst.id);
        }
      }

      for (const id of finished) {
        live.delete(id);
      }

      return finished.length > 0;
    },

    records: () => [...live.values()].map(({ id, size, tone }) => ({ id, size, tone })),

    placements: () => [...live.values()].map(({ id, x, y }) => ({ id, x, y })),

    clear: () => live.clear(),
  };
}
