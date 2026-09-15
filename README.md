# sky-1945

![SKY-1945](public/logo.webp)

A vertical bullet-hell shooter built from the game specification in
[`.claude/docs/game-spec.md`](.claude/docs/game-spec.md), extended with the PULSE DRIVE mechanic from
[`.claude/docs/SKY-1945 — PULSE DRIVE Change Request.md`](<.claude/docs/SKY-1945 — PULSE DRIVE Change Request.md>).

## How it was built

- It starts from a Vite React + TypeScript template with ESLint
  (`create-vite@9.2.1 --template react-ts --eslint`).
- The specification describes what the game looks like and how it plays; it says nothing about how the
  code should be organised.
- Runtime and build dependencies are pinned to the versions the specification lists.
- Tests run on `node --test`.

## Running it

```bash
npm install
npm run dev
```

`npm run lint`, `npm test` and `npm run build` are also available.
