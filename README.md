# sky-1945 — without blueprint

![SKY-1945](public/logo.webp)

This branch is sky-1945 built without [@kekkai/blueprint](https://www.npmjs.com/package/@kekkai/blueprint).
It records what the code looks like when no architecture contract is in place. It is not a verdict
on either approach; the blueprint-governed version is on [`main`](https://github.com/taco3064/sky-1945/tree/main).

## How it was built

- It starts from the repository's initial commit and a Vite React + TypeScript template with ESLint
  (`create-vite@9.2.1 --template react-ts --eslint`).
- The only input was the game specification in [`.claude/docs/game-spec.md`](.claude/docs/game-spec.md):
  what the game looks like, how it plays, and the numbers behind both. It says nothing about how the
  code should be organised.
- Development happened in a separate clone that held only this branch, so neither `main` nor its history
  was in the working copy.
- Runtime and build dependencies are pinned to the versions the specification lists.

## What differs from `main`

- There is no `blueprint.config.mjs`, and no generated lint rules, handbook or agent contract.
- Lint is the template's ESLint configuration. Tests run on `node --test`.
- The specification was written from the game on `main`, and the runtime and build dependencies use the
  versions in `main`'s lockfile.

## Running it

```bash
npm install
npm run dev
```

`npm run lint`, `npm test` and `npm run build` are also available.
