# sky-1945

![SKY-1945](public/logo.webp)

A vertical bullet-hell shooter with no canvas — every aircraft and bullet is a `div`.
**[▶ Play it](https://taco3064.github.io/sky-1945/)**

It is also an experiment in what an architecture contract does to a 60fps game loop.

## @kekkai/blueprint

[@kekkai/blueprint](https://www.npmjs.com/package/@kekkai/blueprint) is architecture as
code for React and Vue. One config declares the architecture — the layers or modules,
which way imports may flow, which layer owns which package — and compiles it into:

- ESLint rules that fail when code crosses a boundary
- a handbook for people
- a contract for coding agents

It has governed this repo since the first commit.

## Three snapshots

| Blueprint | Topology | Source |
| --- | --- | --- |
| 3.1.0 | layer-first | https://github.com/taco3064/sky-1945/tree/layer-first-pre-v4/src |
| 4.0.0 | module-first | https://github.com/taco3064/sky-1945/tree/module-first/src |
| 4.0.0 | layer-first | https://github.com/taco3064/sky-1945/tree/layer-first/src |

Blueprint enforces either topology. Moving between them changed only where files live
and 88 import paths, and the round trip returned a `src` byte-identical to the first
snapshot. `main` is module-first.

## What it produced

- No blueprint rule has been disabled, and no config change has loosened one.
- `matter-js` stays in `engine`, and no component imports the engine — both fail lint.
- Module-first put 38 of 48 units in `stage`: a game loop is one domain.
- Every defect that reached play was caught by a person watching the screen, not by
  lint or tests. Structure is not correctness.

## Running it

```bash
npm install
npm run dev
```

CI gates: `npm run lint`, `npx tsc -b`, `npm run coverage`, `npm run inspect`,
`npx blueprint doctor`.
