# sky-1945 — with blueprint

![SKY-1945](public/logo.webp)

This branch is sky-1945 built with [@kekkai/blueprint](https://www.npmjs.com/package/@kekkai/blueprint) 4.0.0,
from the same specification and the same starting files as the build without it on
[`experiment/no-blueprint`](https://github.com/taco3064/sky-1945/tree/experiment/no-blueprint).
It records what the code looks like under this architecture contract. It is not a verdict on either
approach; the original blueprint-governed version is on [`main`](https://github.com/taco3064/sky-1945/tree/main).

## How it was built

- It starts from the repository's initial commit and a Vite React + TypeScript template with ESLint
  (`create-vite@9.2.1 --template react-ts --eslint`), file for file the same scaffold the no-blueprint
  build started from.
- The input was the game specification in [`.claude/docs/game-spec.md`](.claude/docs/game-spec.md),
  which says nothing about how the code should be organised, plus the instruction to adopt blueprint.
- Development happened in a separate clone that held only this branch, so neither `main` nor its history
  was in the working copy.
- Runtime and build dependencies are pinned to the versions the specification lists.

## How the contract changed during the build

- It started as a module-first config with eleven game-domain modules and its own `components`, `hooks`
  and `lib` layers, without `reactPreset`, so only the structural rules were active.
- The modules were then consolidated into `title`, `loadout`, `stage` and `battle`.
- The config then adopted `reactPreset` in module-first shape: the reserved `app` module holds the screen
  flow, the preset's inner layers stay as the preset declares them (`components`, `hooks`, `contexts`,
  `services`), and a `models` layer, which owns `matter-js`, holds the framework-free game rules.
- The last step fixed the preset's rule findings and switched the rules on. All 17 optional gates are active.

## What differs from `main`

- The modules are `app`, `title`, `loadout`, `stage` and `battle`; `main` has `app`, `session`, `title`,
  `loadout` and `stage`.
- The layers are the preset's plus `models`; `main` replaces `services` with an `engine` layer that owns
  `matter-js` and `requestAnimationFrame`.
- Tests run on Vitest with a 100% coverage threshold over all of `src`; `main` holds 100% over `engine`
  and `hooks`.
- There is no CI workflow on this branch.

## Running it

```bash
npm install
npm run dev
```

`npm run lint`, `npm test`, `npm run test:coverage`, `npm run build` and `npx blueprint doctor` are also
available.
