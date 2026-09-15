import { describe, expect, it } from 'vitest';

import { SQUAD_STAGGER, createDirector, squadsForRound, wavesForRound } from './director';
import { FIELD_WIDTH } from '../field';

describe('wavesForRound · the shape of a round', () => {
  // The rhythm is learnable on purpose: what a round changes is how many
  // arrive and how hard they hit, not the order they arrive in.
  it('sends the same kinds in the same order every round', () => {
    const first = wavesForRound(1).map((wave) => wave.kind);
    const tenth = wavesForRound(10).map((wave) => wave.kind);

    expect(first).toEqual(tenth);
    expect(first).toEqual(['small', 'small', 'medium', 'large']);
  });

  it('spaces the waves out rather than stacking them', () => {
    const times = wavesForRound(1).map((wave) => wave.at);

    expect(times[0]).toBe(0);

    for (const [index, at] of times.entries()) {
      expect(at).toBe(times[0] + index * (times[1] - times[0]));
    }
  });

  // Difficulty as a function of the round, which is what keeps this module
  // from becoming one table per round.
  it('sends more of everything as the rounds go on', () => {
    const early = wavesForRound(1).map((wave) => wave.count);
    const later = wavesForRound(5).map((wave) => wave.count);

    for (const [index, count] of later.entries()) {
      expect(count).toBeGreaterThan(early[index]);
    }
  });

  it('stops growing at the concurrency ceiling for each kind', () => {
    const ceiling = wavesForRound(99);

    expect(ceiling.map((wave) => wave.count)).toEqual([16, 16, 8, 4]);
  });

  it('never sends an empty wave', () => {
    for (const round of [1, 2, 7, 20]) {
      for (const wave of wavesForRound(round)) {
        expect(wave.count).toBeGreaterThan(0);
      }
    }
  });
});

describe('createDirector · sending waves', () => {
  // The first squad, not the first wave: a wave's squads arrive staggered, so
  // "immediately" now means one formation rather than all of them.
  it('starts on round one and sends the first squad immediately', () => {
    const director = createDirector();
    const opening = director.advance(0);

    expect(director.round()).toBe(1);
    expect(opening.length).toBeGreaterThan(1);
    expect(opening.length).toBeLessThan(wavesForRound(1)[0].count);
    expect(new Set(opening.map((spawn) => spawn.path)).size).toBe(1);
  });

  it('holds the next squad until its own time comes', () => {
    const director = createDirector();

    director.advance(0);

    expect(director.advance(SQUAD_STAGGER / 2)).toHaveLength(0);
    expect(director.advance(SQUAD_STAGGER).length).toBeGreaterThan(0);
  });

  it('sends every wave in order, and stops', () => {
    const director = createDirector();
    const sent = director.advance(600);
    const expected = wavesForRound(1).reduce((total, wave) => total + wave.count, 0);

    expect(sent).toHaveLength(expected);
    expect(director.isDrained()).toBe(true);
    expect(director.advance(600)).toHaveLength(0);
  });

  it('spreads a squad across its band, clear of both edges', () => {
    const director = createDirector();
    const xs = director.advance(0).map((spawn) => spawn.entry.x);

    expect(Math.min(...xs)).toBeGreaterThan(0);
    expect(Math.max(...xs)).toBeLessThan(FIELD_WIDTH);
    expect(new Set(xs).size).toBe(xs.length);
  });
});

describe('createDirector · rounds', () => {
  it('is not drained before the last wave has been sent', () => {
    const director = createDirector();

    director.advance(0);

    expect(director.isDrained()).toBe(false);
  });

  it('restarts the schedule on the next round', () => {
    const director = createDirector();

    director.advance(600);
    director.nextRound();

    expect(director.round()).toBe(2);
    expect(director.isDrained()).toBe(false);
    expect(director.advance(0).length).toBeGreaterThan(0);
  });

  // Counts step every other round rather than every round — a curve that
  // climbs every round reaches the ceiling before the player learns the shape.
  it('sends more enemies as the rounds go on', () => {
    const director = createDirector();
    const first = director.advance(600).length;

    director.nextRound();
    director.advance(600);
    director.nextRound();

    expect(director.advance(600).length).toBeGreaterThan(first);
  });
});

describe('createDirector · the round has two phases', () => {
  it('starts on the waves', () => {
    expect(createDirector().phase()).toBe('waves');
  });

  it('moves to the boss when told, and stays on the same round', () => {
    const director = createDirector();

    director.beginBoss();

    expect(director.phase()).toBe('boss');
    expect(director.round()).toBe(1);
  });

  // Mobs on top of the boss would hide the one thing the fight is about:
  // reading the boss's tell.
  it('sends nothing new once the boss is up', () => {
    const director = createDirector();

    director.beginBoss();

    expect(director.advance(60)).toEqual([]);
  });

  it('goes back to the waves on the next round', () => {
    const director = createDirector();

    director.beginBoss();
    director.nextRound();

    expect(director.phase()).toBe('waves');
    expect(director.round()).toBe(2);
    expect(director.advance(0).length).toBeGreaterThan(0);
  });

  it('does not let the boss phase stall the clock for the next round', () => {
    const director = createDirector();

    director.advance(60);
    director.beginBoss();
    director.advance(60);
    director.nextRound();

    expect(director.isDrained()).toBe(false);
  });
});

describe('createDirector · a wave is several squads, not one row', () => {
  /**
   * Everything the first wave of a round sends.
   *
   * Collected over time rather than in one call, because its squads are
   * staggered — and stopping short of `WAVE_GAP` is what keeps the next wave out
   * of the sample.
   */
  function firstWave(round = 1) {
    const director = createDirector();

    for (let step = 1; step < round; step += 1) {
      director.nextRound();
    }

    const sent = [];

    for (let tick = 0; tick < 26; tick += 1) {
      sent.push(...director.advance(0.1));
    }

    return sent;
  }

  it('sends the wave in more than one formation once it is big enough', () => {
    const paths = new Set(firstWave().map((spawn) => spawn.path));

    expect(firstWave().length).toBeGreaterThan(4);
    expect(paths.size).toBeGreaterThan(1);
  });

  // The point of the split: two squads flying two shapes at the same time, rather
  // than sixteen craft abreast all doing the same thing.
  it('gives each squad its own path', () => {
    const wave = firstWave(5);
    const byPath = new Map<string, number>();

    for (const spawn of wave) {
      byPath.set(spawn.path, (byPath.get(spawn.path) ?? 0) + 1);
    }

    expect(byPath.size).toBeGreaterThan(2);

    for (const count of byPath.values()) {
      expect(count).toBeGreaterThan(1);
    }
  });

  it('spreads squads across the width instead of stacking them', () => {
    const columns = firstWave(5)
      .filter((spawn) => spawn.edge === 'top')
      .map((spawn) => Math.round(spawn.entry.x));

    expect(new Set(columns).size).toBe(columns.length);
  });

  /*
   * The bug a doubled count exposed. Sixteen abreast pressed the outermost lanes
   * against the edges, and `weave` swung them straight off the field to be culled
   * — enemies the player never got to shoot.
   */
  it('starts every craft inside the field, however crowded the wave', () => {
    for (const round of [1, 3, 6, 11]) {
      for (const spawn of firstWave(round)) {
        if (spawn.edge !== 'top') {
          continue;
        }

        expect(spawn.entry.x).toBeGreaterThan(0);
        expect(spawn.entry.x).toBeLessThan(FIELD_WIDTH);
      }
    }
  });

  it('never sends a squad of one', () => {
    for (const round of [1, 2, 4, 8]) {
      const sizes = new Map<string, number>();

      for (const spawn of firstWave(round)) {
        sizes.set(spawn.path, (sizes.get(spawn.path) ?? 0) + 1);
      }

      for (const size of sizes.values()) {
        expect(size).toBeGreaterThan(1);
      }
    }
  });

  // Splitting and staggering must not lose anyone along the way.
  it('sends every craft the wave promised, across all its squads', () => {
    for (const round of [1, 5, 9]) {
      expect(firstWave(round)).toHaveLength(wavesForRound(round)[0].count);
    }
  });

  it('keeps the same craft count into the next round', () => {
    const director = createDirector();
    const first = director.advance(0).map((spawn) => spawn.path);

    director.nextRound();

    const second = director.advance(0).map((spawn) => spawn.path);

    expect(second.length).toBe(first.length);
  });
});

describe('squadsForRound · the schedule', () => {
  // What the stagger is for: three formations appearing at the same instant read
  // as noise. Staggered, the player sees the first commit before the next lands.
  it('staggers the squads of one wave instead of sending them together', () => {
    const times = squadsForRound(5).map((squad) => squad.at);

    expect(new Set(times).size).toBe(times.length);
  });

  it('keeps the squads of one wave inside that wave own slot', () => {
    const squads = squadsForRound(5);

    const firstWaveTimes = squads
      .filter((squad) => squad.kind === squads[0].kind && squad.at < 2.75)
      .map((squad) => squad.at);

    expect(firstWaveTimes.length).toBeGreaterThan(1);
    expect(Math.max(...firstWaveTimes)).toBeLessThan(2.75);
  });

  it('sends them in order', () => {
    const times = squadsForRound(7).map((squad) => squad.at);

    for (const [index, at] of times.slice(1).entries()) {
      expect(at).toBeGreaterThan(times[index]);
    }
  });

  it('accounts for every craft the waves promised', () => {
    for (const round of [1, 4, 9]) {
      const scheduled = squadsForRound(round)
        .reduce((total, squad) => total + squad.lanes.length, 0);

      const promised = wavesForRound(round)
        .reduce((total, wave) => total + wave.count, 0);

      expect(scheduled).toBe(promised);
    }
  });

  it('never schedules a squad of one', () => {
    for (const round of [1, 2, 5, 11]) {
      for (const squad of squadsForRound(round)) {
        expect(squad.lanes.length).toBeGreaterThan(1);
      }
    }
  });
});
