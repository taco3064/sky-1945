import { Engine } from 'matter-js';
import type { Body } from 'matter-js';

import { createBossField } from '../boss';
import type { BossSnapshot } from '../boss';
import { createBulletField } from '../bullets';
import { createChannel, createKeyedChannel } from '../channel';
import type { Channel } from '../channel';
import { STARTING_LIVES } from '../combat';
import type { CombatSnapshot } from '../combat';
import { createCollisionWatch } from '../collisions';
import { createDirector } from '../director';
import { createEffectField } from '../effects';
import { createEnemyField } from '../enemies';
import { stepFrame } from '../frame';
import type { FrameParts, FrameResult } from '../frame';
import { createPilot } from '../pilot';
import type {
  Channels,
  EntityId,
  EntityRecord,
  FrameChannel,
  FrameListener,
  FrameRate,
  Latest,
  Meter,
  Transform,
  World,
  WorldOptions,
} from './types';

/** One frame at 60Hz, and the ceiling on any single step. */
const MAX_STEP_SECONDS = 1 / 60;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Subscribe, and deliver the current value straight away. */
function openWith<T>(channel: Channel<T>, current: () => T) {
  return (onChange: (value: T) => void) => {
    const stop = channel.subscribe(onChange);

    onChange(current());

    return stop;
  };
}

/** Everything on the field, right now. */
function rosterOf(parts: FrameParts): EntityRecord[] {
  return [
    { id: parts.pilot.id, kind: 'player' },
    ...parts.bullets.records().map(({ id, hostile }): EntityRecord => ({
      id,
      kind: hostile ? 'enemy-bullet' : 'player-bullet',
    })),
    ...parts.enemies.records().map(({ id, kind }): EntityRecord => ({
      id,
      kind: `enemy-${kind}`,
    })),
    ...parts.boss.records().map(({ id, kind }): EntityRecord => ({
      id,
      kind: `enemy-${kind}`,
    })),
    ...parts.effects.records().map(({ id, size, tone }): EntityRecord => ({
      id,
      kind: 'burst',
      burst: { size, tone },
    })),
  ];
}

/** Send every position on the field down the transform channel. */
function publishFrames(parts: FrameParts, frames: FrameChannel, latest: Latest): void {
  // Rebuilt each frame, so it holds exactly what is alive.
  latest.clear();

  const at = (id: EntityId, transform: Transform): void => {
    latest.set(id, transform);
    frames.send(id, transform);
  };

  at(parts.pilot.id, transformOf(parts.pilot.body));

  const moving = [
    ...parts.bullets.bodies(),
    ...parts.enemies.bodies(),
    ...parts.boss.bodies(),
  ];

  for (const body of moving) {
    at(body.id, transformOf(body));
  }

  // Bursts do not move, but a subscriber mounting mid-burst still needs a position.
  for (const { id, x, y } of parts.effects.placements()) {
    at(id, { x, y, angle: 0 });
  }
}

/** Subscribe to a transform and deliver the last one known straight away. */
function openTransform(frames: FrameChannel, latest: Latest) {
  return (id: EntityId, onFrame: FrameListener) => {
    const stop = frames.subscribe(id, onFrame);
    const known = latest.get(id);

    if (known) {
      onFrame(known);
    }

    return stop;
  };
}

/** Whether two combat snapshots say the same thing — field by field, not by reference. */
function sameCombat(a: CombatSnapshot, b: CombatSnapshot): boolean {
  return a.rolling === b.rolling
    && a.invulnerable === b.invulnerable
    && a.ready === b.ready;
}

function createChannels(): Channels {
  return {
    frames: createKeyedChannel<EntityId, Transform>(),
    roster: createChannel<EntityRecord[]>(),
    combat: createChannel<CombatSnapshot>(),
    round: createChannel<number>(),
    lives: createChannel<number>(),
    gameOver: createChannel<void>(),
    boss: createChannel<BossSnapshot | null>(),
    rate: createChannel<FrameRate>(),
  };
}

/** How long the frame meter averages over, in milliseconds. */
const METER_WINDOW = 500;

/** Fold one frame into the meter, and hand back a reading when the window closes. */
function meterFrame(meter: Meter, ms: number): FrameRate | null {
  meter.frames += 1;
  meter.elapsed += ms;
  meter.worst = Math.max(meter.worst, ms);

  if (meter.elapsed < METER_WINDOW) {
    return null;
  }

  const rate = {
    fps: Math.round(meter.frames / (meter.elapsed / 1000)),
    worst: Math.round(meter.worst),
  };

  meter.frames = 0;
  meter.elapsed = 0;
  meter.worst = 0;

  return rate;
}

function transformOf(body: Body): Transform {
  return {
    x: body.position.x,
    y: body.position.y,
    angle: (body.angle * 180) / Math.PI,
  };
}

/** Build the simulation's moving parts. */
function assemble(engine: Engine, options: WorldOptions): FrameParts {
  return {
    engine,
    pilot: createPilot(engine, options),
    bullets: createBulletField(engine),
    enemies: createEnemyField(engine),
    effects: createEffectField(),
    collisions: createCollisionWatch(engine),
    director: createDirector(),
    boss: createBossField(engine),
  };
}

/** Everything the outside is told, and the run state only the telling owns. */
function createBroadcast(parts: FrameParts, channels: Channels) {
  let published: CombatSnapshot = { rolling: false, invulnerable: false, ready: true };
  let lives = STARTING_LIVES;

  /** Spend a life, and end the run if that was the last one. */
  const spendLife = (): void => {
    // The engine holds this itself rather than trusting the listener to stop first.
    if (lives === 0) {
      return;
    }

    lives -= 1;
    channels.lives.send(lives);

    if (lives > 0) {
      return;
    }

    channels.gameOver.send(undefined);
  };

  return {
    lives: () => lives,

    /** Announce a combat state directly — used when a roll starts on the keypress. */
    combat(next: CombatSnapshot) {
      published = next;
      channels.combat.send(next);
    },

    result(result: FrameResult): void {
      const combat = parts.pilot.snapshot();

      if (result.rosterChanged) {
        channels.roster.send(rosterOf(parts));
      }

      if (!sameCombat(combat, published)) {
        published = combat;
        channels.combat.send(combat);
      }

      if (result.roundAdvanced) {
        channels.round.send(parts.director.round());
      }

      if (result.bossChanged) {
        channels.boss.send(parts.boss.snapshot());
      }

      if (result.playerDied) {
        spendLife();
      }
    },
  };
}

export function createWorld(options: WorldOptions): World {
  const engine = Engine.create({ gravity: { x: 0, y: 0 } });
  const parts = assemble(engine, options);

  const channels = createChannels();

  const loop = { frame: null as number | null, previous: 0 };
  const latest: Latest = new Map();
  const meter: Meter = { frames: 0, elapsed: 0, worst: 0 };

  const broadcast = createBroadcast(parts, channels);

  const step = (now: number): void => {
    // Held inside [0, MAX]: the floor covers a clock that hands back an older stamp.
    const raw = now - loop.previous;
    const elapsed = clamp(raw / 1000, 0, MAX_STEP_SECONDS);
    const rate = meterFrame(meter, raw);

    if (rate) {
      channels.rate.send(rate);
    }

    loop.previous = now;

    // Simulate, record, then announce: the roster mounts components that ask for
    // a position, so the position has to already be there.
    const result = stepFrame(parts, elapsed);

    publishFrames(parts, channels.frames, latest);
    broadcast.result(result);

    loop.frame = requestAnimationFrame(step);
  };

  return {
    playerId: parts.pilot.id,

    start() {
      if (loop.frame !== null) {
        return;
      }

      loop.previous = performance.now();
      loop.frame = requestAnimationFrame(step);
    },

    pause() {
      if (loop.frame !== null) {
        cancelAnimationFrame(loop.frame);
        loop.frame = null;
      }
    },

    dispose() {
      this.pause();
      parts.collisions.dispose();
      parts.bullets.clear();
      parts.enemies.clear();
      parts.boss.clear();
      parts.effects.clear();

      latest.clear();

      for (const channel of Object.values(channels)) {
        channel.clear();
      }

      Engine.clear(engine);
    },

    subscribe: openTransform(channels.frames, latest),

    subscribeRoster: openWith(channels.roster, () => rosterOf(parts)),

    subscribeCombat: openWith(channels.combat, parts.pilot.snapshot),

    subscribeRound: openWith(channels.round, parts.director.round),

    subscribeLives: openWith(channels.lives, broadcast.lives),

    subscribeGameOver: (onGameOver) => channels.gameOver.subscribe(onGameOver),

    subscribeBoss: openWith(channels.boss, parts.boss.snapshot),

    subscribeFrameRate: (onChange) => channels.rate.subscribe(onChange),

    setPlayerDirection: (x, y) => parts.pilot.point(x, y),

    // Announced on the keypress, not 16ms later at the next frame's publish.
    roll() {
      if (!parts.pilot.roll()) {
        return;
      }

      broadcast.combat(parts.pilot.snapshot());
    },
  };
}
