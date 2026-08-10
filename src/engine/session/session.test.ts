import { describe, expect, it } from 'vitest';

import { INITIAL_SESSION, nextSession } from './session';
import type { SessionEvent, SessionState } from './session';

// Restated here because the source keeps the transition table private. A
// state or event added there without a line here leaves the new pair
// untested, and the illegal sweep below silently stops covering it.
const STATES: SessionState[] = ['title', 'loadout', 'playing', 'paused', 'gameover'];

const EVENTS: SessionEvent[] = [
  'start', 'confirm', 'pause', 'resume', 'abort', 'die', 'reset',
];

/** Every pair the machine accepts, and where it lands. */
const LEGAL: [SessionState, SessionEvent, SessionState][] = [
  ['title', 'start', 'loadout'],
  ['loadout', 'confirm', 'playing'],
  ['playing', 'pause', 'paused'],
  ['paused', 'resume', 'playing'],
  ['paused', 'abort', 'title'],
  ['playing', 'die', 'gameover'],
  ['gameover', 'reset', 'title'],
];

const legalPairs = new Set(LEGAL.map(([from, event]) => `${from}:${event}`));

/** The other 28 of the 35 possible pairs — derived, so it cannot drift. */
const ILLEGAL: [SessionState, SessionEvent][] = STATES
  .flatMap((state) => EVENTS.map((event): [SessionState, SessionEvent] => [state, event]))
  .filter(([state, event]) => !legalPairs.has(`${state}:${event}`));

describe('session · the run starts at the title', () => {
  it('opens on the title screen', () => {
    expect(INITIAL_SESSION).toBe('title');
  });
});

describe('session · accepted transitions', () => {
  it.each(LEGAL)('%s + %s lands on %s', (from, event, to) => {
    expect(nextSession(from, event)).toBe(to);
  });
});

describe('session · every other pair is refused, not thrown', () => {
  it('sweeps all 35 pairs, 7 accepted and 28 refused', () => {
    expect(LEGAL.length + ILLEGAL.length).toBe(STATES.length * EVENTS.length);
    expect(ILLEGAL).toHaveLength(28);
  });

  it.each(ILLEGAL)('%s ignores %s and stays put', (from, event) => {
    expect(nextSession(from, event)).toBe(from);
  });
});

describe('session · pause is the only two-way edge', () => {
  it('returns to exactly the state it left', () => {
    const paused = nextSession('playing', 'pause');

    expect(paused).toBe('paused');
    expect(nextSession(paused, 'resume')).toBe('playing');
  });

  // The `state !== 'paused'` guard is load-bearing, and its absence is what
  // this test caught on the first run: a refused event returns the state
  // unchanged, so "landed on paused" and "was already paused and refused"
  // are the same value. Entering has to exclude the state already there.
  it('cannot be entered from anywhere but playing', () => {
    const enterable = STATES.filter(
      (state) => state !== 'paused' && nextSession(state, 'pause') === 'paused',
    );

    expect(enterable).toEqual(['playing']);
  });
});

describe('session · a run can always be left', () => {
  // Without this edge the only exit is running out of lives (#6), and a
  // player who opens the pause screen has nowhere to go.
  it('quits from paused straight to the title', () => {
    expect(nextSession('paused', 'abort')).toBe('title');
  });

  it('cannot be quit mid-flight — pausing comes first', () => {
    expect(nextSession('playing', 'abort')).toBe('playing');
  });

  it('walks title → loadout → playing → paused → title', () => {
    const walk = (['start', 'confirm', 'pause', 'abort'] as SessionEvent[])
      .reduce<SessionState[]>(
        (trail, event) => [...trail, nextSession(trail[trail.length - 1], event)],
        [INITIAL_SESSION],
      );

    expect(walk).toEqual(['title', 'loadout', 'playing', 'paused', 'title']);
  });
});

describe('session · a run loops back to the title', () => {
  it('walks title → loadout → playing → gameover → title', () => {
    const walk = (['start', 'confirm', 'die', 'reset'] as SessionEvent[])
      .reduce<SessionState[]>(
        (trail, event) => [...trail, nextSession(trail[trail.length - 1], event)],
        [INITIAL_SESSION],
      );

    expect(walk).toEqual(['title', 'loadout', 'playing', 'gameover', 'title']);
  });
});
