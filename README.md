# sky-1945

![SKY-1945](public/logo.webp)

A vertical bullet-hell shooter with no canvas. Every aircraft, bullet and
explosion is a `div`, moved by a physics engine that is only allowed to answer one
question.

**[▶ Play it](https://taco3064.github.io/sky-1945/)** — arrows to fly, space to
barrel-roll, escape to pause. On a phone: hold anywhere for a stick, tap to roll.

It also exists to answer one: **what does an architecture contract written for
CRUD front ends grow when the domain is a 60fps game loop?**
[@kekkai/blueprint](https://www.npmjs.com/package/@kekkai/blueprint) has governed
this repository since its first commit. What follows is what that produced,
including the half it did not.

## How it is built

React + TypeScript, Vite, Matter.js, Vitest. Versions live in `package.json`,
which is the only place they can be correct.

**Pure DOM.** No `<canvas>`, `<svg>` or WebGL in `src`. An aircraft is a handful
of `div`s with `clip-path` and gradients; a bullet is one. Positions are written
straight to `style.transform` and never through React state — React owns birth and
death, the engine owns position.

**Matter.js in sensor mode.** Gravity off, every body a sensor, every position set
with `Body.setPosition` — no `applyForce` and no `setVelocity` anywhere. Matter
answers *did these two things touch*; how a craft moves is arithmetic in
`src/engine`. Deliberate: inertia on a dodge is indistinguishable from input lag.

## The contract

`blueprint.config.mjs` compiles to three things: ESLint rules, a generated handbook
(`docs/architecture-handbook.md`), and the contract an agent reads (`CLAUDE.md`).
The React preset's `principles`, `componentShape`, `playbook` and `rules` are
spread in **unchanged** — editing them to suit a game would have ended the
experiment. Only `architecture` is this project's own: the preset's `services`
became `engine`, which owns `matter-js` and `requestAnimationFrame`, and `zustand`
was dropped, because a contract naming a package the repo does not install
describes nothing.

Layers run one way — `pages → containers → components → hooks → contexts →
engine`. The budgets on lines, function length, parameters and complexity come from
the preset, and the handbook lists them all.

## What it produced

- **No blueprint rule has ever been disabled.** The one `eslint-disable` in `src`
  is `react-refresh/only-export-components`, a Vite plugin's warn-level rule, on
  the file that has to export both a Provider and its Context.
- **No edit to the contract has been a loosening.** One config change since the
  scaffold: `testFiles` widened to count `*.fixtures.ts`, which *added* a gate —
  until then the fixture ban had nothing to catch (#27).
- **One linter, and not the one this started with.** oxlint is gone, its two rules
  moved onto React's own plugins, and `eslint.config.mjs` is owned by this repo
  rather than regenerated. The `emitLint(blueprint)` spread inside it is untouched,
  so every structural rule still comes from `blueprint.config.mjs` at runtime — and
  a CI gate now checks that it is still in force (below).
- **One rule the contract could not express.** Type declarations live in their
  module's `types.ts` — 110 of them moved out of 40 implementation files — held by
  a hand-written lint rule, because no config can require a `types.ts` to exist or
  say that a declaration belongs in one (#34). An owner opinion, recorded as a
  finding rather than quietly absorbed: this repo is one structural rule richer
  than the preset.
- **The boundaries are machine-checked, not remembered.** `matter-js` is reachable
  only from `engine`; the animation loop lives in one module because that layer
  owns the global; no `components` file imports the engine. All three fail lint.
- **Modules exist that would not otherwise.** Every time a file hit its line budget
  the forced split turned out to be a real seam: `engine/frame` out of
  `engine/world` (a frame, versus the simulation's lifetime), `boss/stances` out of
  `boss/boss` (the fight's state machine, versus its bodies), `engine/channel` out
  of the same subscribe-and-broadcast block written three times over, and
  `world/createBroadcast` out of `createWorld` (building and running the world,
  versus deciding what is worth announcing).
- **A parameter limit improved an interface.** `enemies.spawn` took a kind, a path
  and an entry point; an entry *edge* would have been one argument too many. It
  takes a single `EnemySpec` now, declared by the side that has to fly it.
- **Coverage is a floor, not a target.** 100% on `engine` and `hooks` — pure
  functions and state machines, where a test holds something. Whether an aircraft
  *looks* right is checked in a browser.

## What it did not catch

The honest half. Every defect that reached play was found by a person watching the
screen, not by the suite and not by any lint rule:

- the boss finished its entrance centred, then jumped sideways on its first
  patrolling frame — its patrol read a clock that had been running since it
  spawned;
- the beam's charge line grew out of the boss's back — enemy craft are drawn
  nose-up and rotated by the transform, so the CSS top edge is the bottom of the
  screen;
- a higher enemy count pressed the outermost lanes into the field edges, and a
  weaving craft swung off the field and was culled.

None was a structural violation. The layers were correct, the boundaries held, and
coverage was at its floor throughout. Every assertion looked at one frame, or one
lane, at a time — and a discontinuity is invisible from a single sample.

So structure is not correctness. What the contract did buy is that every fix was
cheap and local, and each arrived with the regression test that had been missing.

## One thing the domain decided, not the contract

Nothing in the engine rolls a die mid-flight. Enemy formations, flight shapes,
entry edges and the boss's attack order all derive from a seed and a slot number.
Two reasons, and the second is the real one: a test cannot assert against a die,
and a player cannot learn a level that rolls one — round four is cleared on the
third attempt because the player remembers what comes next.

Where a die is thrown at all it is thrown once, at the boundary, and what it
produces is a seed the derivation is handed. Seeding the boss per duel rather than
per round (#44) is what stopped every player's round four from being one fight.

## Running it

```bash
npm install
npm run dev
```

Every gate, in the order CI runs them. CI gates the deploy, so a published build is
one where all five passed:

```bash
npm run lint          # eslint, including blueprint's emitted rules
npx tsc -b            # types
npm run coverage      # tests, against the coverage floor
npm run inspect       # the layer graph — does the code obey the contract
npx blueprint doctor  # the wiring — are those rules still enforced
```
