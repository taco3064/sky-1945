import { describe, expect, it } from 'vitest';

import { createDirector, wavesForRound } from './director';
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

    expect(ceiling.map((wave) => wave.count)).toEqual([8, 8, 4, 2]);
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
  it('starts on round one and sends the first wave immediately', () => {
    const director = createDirector();

    expect(director.round()).toBe(1);
    expect(director.advance(0)).toHaveLength(wavesForRound(1)[0].count);
  });

  it('holds the second wave until its time comes', () => {
    const director = createDirector();

    director.advance(0);

    expect(director.advance(1)).toHaveLength(0);
  });

  it('sends every wave in order, and stops', () => {
    const director = createDirector();
    const sent = director.advance(600);
    const expected = wavesForRound(1).reduce((total, wave) => total + wave.count, 0);

    expect(sent).toHaveLength(expected);
    expect(director.isDrained()).toBe(true);
    expect(director.advance(600)).toHaveLength(0);
  });

  it('spreads a wave across the field, clear of both edges', () => {
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
