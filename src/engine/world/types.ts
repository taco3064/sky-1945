import type { BossSnapshot } from '../boss';
import type { Channel, KeyedChannel } from '../channel';
import type { CombatSnapshot } from '../combat';
import type { BurstSize, BurstTone } from '../effects';

/** Matter body ids, and burst ids — which count down from -1. */
export type EntityId = number;

/** Everything that can be on the field, flat enough for a lookup table. */
export type EntityKind
  = | 'player'
    | 'player-bullet'
    | 'enemy-bullet'
    | 'enemy-small'
    | 'enemy-medium'
    | 'enemy-large'
    | 'enemy-boss'
    | 'enemy-beam'
    | 'burst';

export interface EntityRecord {
  id: EntityId;
  kind: EntityKind;
  /** Bursts only: how big, and whose wreckage it is. */
  burst?: { size: BurstSize; tone: BurstTone };
}

export interface Vector2 {
  /** World units from the field's left edge. */
  x: number;
  /** World units from the field's top edge. */
  y: number;
}

export interface Transform extends Vector2 {
  /** Degrees, ready for a CSS rotate(). */
  angle: number;
}

export type FrameListener = (transform: Transform) => void;

export type RosterListener = (entities: EntityRecord[]) => void;

export type CombatListener = (snapshot: CombatSnapshot) => void;

export type RoundListener = (round: number) => void;

export type LivesListener = (remaining: number) => void;

export type BossListener = (boss: BossSnapshot | null) => void;

export type FrameRateListener = (rate: FrameRate) => void;

/** What the frame meter reports, once per window. */
export interface FrameRate {
  /** Frames per second, averaged across the window. */
  fps: number;
  /** The longest single frame in the window, in milliseconds. */
  worst: number;
}

export type GameOverListener = () => void;

export interface WorldOptions {
  /** The loadout's speed multiplier, 1–3. */
  speedMultiplier: number;
  /** The loadout's power multiplier, 1–3. */
  powerMultiplier: number;
}

export interface World {
  /** The player body's id, for subscribing to it. */
  readonly playerId: EntityId;
  /** Begin stepping. Also resumes from `pause`. Twice is a no-op. */
  start: () => void;
  /** Stop stepping, keeping every body. `start` resumes without a jump. */
  pause: () => void;
  /** Stop the loop and release everything. Safe to call more than once. */
  dispose: () => void;
  /** Watch an entity's transform. Returns its own unsubscribe. */
  subscribe: (id: EntityId, onFrame: FrameListener) => () => void;
  /** Watch which entities exist. Fires on spawn and despawn, not per frame. */
  subscribeRoster: (onChange: RosterListener) => () => void;
  /** Watch the player's combat state. Fires on change, not per frame. */
  subscribeCombat: (onChange: CombatListener) => () => void;
  /** Watch the round number. Fires when a round is cleared. */
  subscribeRound: (onChange: RoundListener) => () => void;
  /** Watch how many aircraft the run has left. */
  subscribeLives: (onChange: LivesListener) => () => void;
  /** Fires when the last life is gone. */
  subscribeGameOver: (onGameOver: GameOverListener) => () => void;
  /** Watch the frame rate. Fires twice a second, not every frame. */
  subscribeFrameRate: (onChange: FrameRateListener) => () => void;
  /** Watch the boss: its hit points, its stance, and null when there is none. */
  subscribeBoss: (onChange: BossListener) => () => void;
  /** Point the player. Any vector; length is normalised away. */
  setPlayerDirection: (x: number, y: number) => void;
  /** Attempt a barrel roll. Ignored while one is already running. */
  roll: () => void;
}

export type FrameChannel = KeyedChannel<EntityId, Transform>;

/** Every live position as of the last frame, so a new subscriber can be told. */
export type Latest = Map<EntityId, Transform>;

/**
 * Every channel the outside can listen on.
 *
 * Written out rather than inferred from `createChannels`: deriving it would point
 * this file back at the implementation, and declarations do not depend on code.
 * `createChannels` is annotated with it, so a field that drifts fails to compile.
 */
export interface Channels {
  frames: FrameChannel;
  roster: Channel<EntityRecord[]>;
  combat: Channel<CombatSnapshot>;
  round: Channel<number>;
  lives: Channel<number>;
  gameOver: Channel<void>;
  boss: Channel<BossSnapshot | null>;
  rate: Channel<FrameRate>;
}

export interface Meter {
  frames: number;
  elapsed: number;
  worst: number;
}
