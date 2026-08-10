/**
 * Bursts: the aircraft coming apart, on either side.
 *
 * They have no bodies. A burst collides with nothing, so putting it in the
 * physics world would be paying the broad phase for a decoration — it needs a
 * position, an id, and a lifetime, and that is all this module holds.
 *
 * The dead craft is removed the instant it dies and a burst is left in its
 * place, rather than the craft lingering in a dying state. One less state for
 * every consumer to ask about.
 */

/** How long a burst is on screen. Matches the CSS animation in components/Burst. */
export const BURST_DURATION = 0.6;

/** How big, which is also how many shards. */
export type BurstSize = 'small' | 'large';

/** Whose wreckage — decides the palette, nothing else. */
export type BurstTone = 'ally' | 'enemy';

export interface BurstRecord {
  id: number;
  size: BurstSize;
  tone: BurstTone;
}

export interface BurstStyle {
  size: BurstSize;
  tone: BurstTone;
}

export interface BurstPlacement {
  id: number;
  x: number;
  y: number;
}

export interface EffectField {
  /** Start a burst at a point. */
  burst: (at: { x: number; y: number }, style: BurstStyle) => void;
  /** Age everything; drop what has finished. True if anything finished. */
  advance: (elapsed: number) => boolean;
  /** Live bursts, for the roster. */
  records: () => BurstRecord[];
  /** Where each one is, for publishing transforms. */
  placements: () => BurstPlacement[];
  clear: () => void;
}

interface Burst extends BurstRecord, BurstPlacement {
  remaining: number;
}

export function createEffectField(): EffectField {
  const live = new Map<number, Burst>();

  /**
   * Burst ids count down from -1.
   *
   * Matter hands out positive ids, and bursts share the transform channel with
   * real bodies — negative ids cannot collide with those, and a negative id
   * showing up anywhere it should not is unmistakable.
   */
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
