# sky-1945

![SKY-1945](public/logo.webp)

A vertical bullet-hell shooter built from the game specification in
[`.claude/docs/game-spec.md`](.claude/docs/game-spec.md), with its architecture governed by
[@kekkai/blueprint](https://www.npmjs.com/package/@kekkai/blueprint) 4.0.0.

## How it was built

- It starts from a Vite React + TypeScript template with ESLint
  (`create-vite@9.2.1 --template react-ts --eslint`).
- The specification describes what the game looks like and how it plays; it says nothing about how the
  code should be organised.
- Runtime and build dependencies are pinned to the versions the specification lists.

## How the blueprint config changed during the build

- It started as a module-first config with eleven game-domain modules and its own `components`, `hooks`
  and `lib` layers, without `reactPreset`, so only the structural rules were active.
- The modules were then consolidated into `title`, `loadout`, `stage` and `battle`.
- The config then adopted `reactPreset` in module-first shape: the reserved `app` module holds the screen
  flow, the preset's inner layers stay as the preset declares them (`components`, `hooks`, `contexts`,
  `services`), and a `models` layer, which owns `matter-js`, holds the framework-free game rules.
- The last step fixed the preset's rule findings and switched the rules on. All 17 optional gates are active.

## Running it

```bash
npm install
npm run dev
```

`npm run lint`, `npm test`, `npm run test:coverage`, `npm run build` and `npx blueprint doctor` are also
available.
