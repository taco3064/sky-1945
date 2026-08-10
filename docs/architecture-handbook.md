# sky-1945 — Architecture Handbook

> Generated from `blueprint.config` by `@kekkai/blueprint` — edit the blueprint, not this file.

## Architecture

Code flows one way: each layer may import only from the layers below it. Upstream and same-layer imports are barred.

```mermaid
flowchart TD
  pages -.-> containers
  containers -.-> components
  components -.-> hooks
  containers -->|Provider only| contexts
  hooks -->|Context only · selfOnly| contexts
  containers --> engine
  hooks --> engine
  contexts --> engine
```

> **How to read the diagram**: a **solid** edge is a declared importer relation (its label carries the description and/or `selfOnly` — depend on it, never re-export it). A **dotted** edge only records declaration order: adjacent layers are not necessarily related. Reachability is transitive — a layer may import **any** layer below it in the flow, whether or not an edge is drawn, unless the target narrows its importers (`allowedImporters`).

### Layers

| Layer | Responsibility | Must not | Owns |
| --- | --- | --- | --- |
| `pages` | Mounts the game shell. | hold game logic; stack components directly | — |
| `containers` | Screens: title, loadout, stage, HUD. Assembles components, owns local state, drives a round. | — | — |
| `components` | Presentational only — aircraft, bullets, bars. Props and refs, nothing else. | own game state; read the engine; open an animation loop | — |
| `hooks` | Adapts the engine simulation to React. The only layer that may inject context. | — | `react` → `useContext` |
| `contexts` | Defines and provides Context / Provider only — carries the world instance down. | — | `react` → `createContext` |
| `engine` | Pure TS simulation: physics world, collision, bullet patterns, damage, scheduling. Never imports React. | — | `matter-js`, global `requestAnimationFrame` |

## Module shape

One module = one folder. Only `index` is public; everything else stays private to the module.

```
pages/
└─ Example/
   ├─ index   # public entry — the only importable file
   ├─ Example # implementation (named after the module)
   ├─ hooks   # private
   ├─ styles  # private
   └─ types   # private
```

## Import discipline

These boundaries are enforced by the generated ESLint config — one blueprint drives both:

- **One-way only** — a layer imports only from the layers below it; upstream imports are errors.
- **No same-layer imports** — extract shared logic down to a lower layer instead.
- **Entry-only** — import a module through its `index`, never its internals.
- **No redundant relative segments** (`./../`, `././`) that bypass the rules.
- **Ownership** — packages and globals are restricted to their owning layer (see the *Owns* column above).
- **selfOnly** — where a layer narrows its importers with `selfOnly`, that importer may depend on it but must never re-export it onward.

## Component shape — 7 orthogonal axes

A set, not a pipeline: each axis is an independent yes/no design decision — never infer
that one axis holds because another does. Numbering is identity, not order, and trivial
changes need not force the full pass. Lint is an entry point here, never a verdict.

### 1. Ownership Inversion — The unit that needs derived state owns the derivation.

Do not precompute in the parent and drill the result down — the child imports the hook and derives it itself. Field-tested: 17 props down to 7.

### 2. IO Shrinkage — Narrow the inputs, shrink the outputs.

Three moves: split a multi-concern unit; collapse parallel raw states carrying an invariant into one modeled state; merge symmetric twins into one object of the same shape. Count and size are weak signals — whether the state is modeled is the review call.

> Triage: `max-params` is the review entry point — the verdict stays with review.

### 3. SRP Decomposition — Split on responsibility boundaries, not on size.

Naming test: if you cannot name it without "and", it wants splitting; dissolving code into an existing home is also a split. Exception: writable state that must stay in sync — force-splitting it manufactures sync bugs.

> Triage: `max-statements` is the review entry point — the verdict stays with review.

### 4. Orchestration Shell — A page only orchestrates.

Route/id resolution, the loading shell, shared sources, cross-child lifecycle — never deriving values on behalf of each child. Field-tested: a 6666-line detail page down to 552.

> Triage: `max-lines` is the review entry point — the verdict stays with review.

### 5. Scoped Writable State — Writable state lives at the lowest common owner of its writers and readers.

Hoist only what is genuinely shared across a boundary; state that must survive a route change goes to the URL or a store. "Might be shared later" is YAGNI — hoist when the sharing arrives.

### 6. Lifecycle Internalization — If lifecycle is part of the responsibility, build it in.

The caller receives a unit that is already running and cleans itself up — not a kit of handlers to wire into mount/effect hooks. Field-tested: 19 exports down to a one-line call.

### 7. Pure Helpers ≠ Composables — Keep pure functions out of reactive/lifecycle units.

One exported function does not demand one file: responsibility splits at the function level; the file splits only when max-lines approaches. Expose the decision a unit makes, not its raw ingredients.

## Principles

### Behavioral (held in review / CLAUDE.md)

- **Split by responsibility, not by size** — The signal to split is how many things a unit does — line count is only a backstop.
- **One source of truth** — Derive computed values; never store duplicate mutable state that can desync.
- **Keep interfaces narrow** — Narrow inputs and outputs so illegal states cannot be expressed.
- **Keep knowledge where it is used** — Push derivation to the child and state to its lowest common owner; do not hoist.
- **Dead code: delete it or mark it** — An abstraction with no consumer is dead; sweep orphans, mark retained-dead as deprecated.
- **Lint is an entry point, not a verdict** — Mechanical checks only triage; cohesion and invariants need review.
- **Acceptance criteria are a start, not scripture** — Fixing a ticket that violates an abstraction's responsibility is upholding the design.
- **YAGNI — do not over-engineer** — "Might need it later" is not a reason to abstract now.
- **Cost is the third dimension** — Cost = work per event × event frequency; price any logic wired to a data source.

## Working playbook

Judgment rules no tool enforces — they hold in review and in the agent contract.

### Runtime load discipline

- **Price every handler attached to a data source.** — Before wiring anything to WS / polling / scroll / input, answer: events per second, data per event, per-event cost. If you cannot answer, it does not merge — and copying an existing pattern is no exemption, because frequency is not in the code.
- **High-frequency updates write in place.** — Patch the changed entry and keep container identity; whole-replace is for baseline rebuilds only. A prop whose identity changed while its value did not is the disease. Write shapes do not port across frameworks.
- **Diagnose re-renders in four steps, never by guessing.** — Who renders (profiler) → what triggered it (render tracing) → who produced the identity (grep the assignment sites) → was it worth it (compare against the event payload).
- **Performance claims must be acceptance-testable.** — "Fewer re-renders" is not a claim; "one event re-renders at most N components" is. Pin it with a render-count or identity-stability test — an unmeasured performance claim did not happen.

### Refactor discipline

- **Safety net first, then split, then tidy the tests.** — Three stages, one commit each, non-overlapping review scopes. Writing the net first forces the observable contract into the open.
- **One refactor arc = one PR, one commit per phase.** — The PR body maps each commit to its phase; ask before splitting the arc into separate tickets.
- **Extract by copying from source, never by rewriting from memory.** — After extraction, diff the target against git history — a passing suite alone does not prove the extraction faithful.
- **Scan every identifier before extracting.** — Not just reactive refs — imports, local definitions, parameters. A missed dependency surfaces later as a broken extraction.
- **Do not pin what the refactor itself will change.** — A safety net asserting values the arc is about to change fails the moment the sibling refactor lands.
- **AC-named payload fields deserve a contract test.** — Asserting that the mocked service receives field X is not a tautology — a dropped field or an unbound handler breaks it while the source constant stays green.
- **Wrap an arc with cross-cutting themes and verified numbers.** — Name the forces (ownership inversion, IO shrinkage, SRP) and attach before/after numbers verified against git history.

### Design collaboration

- **Frame architectural corrections as guarding the design.** — State the principle being protected, show how the literal ticket reading violates it, and present the choice as that principle's natural consequence.
- **Do not reopen settled designs.** — When the shape has been specified, implement it as spec. Raise genuine concerns once, with reasons — not as a menu of alternatives.
- **"The user can work around it" does not park a bug.** — Judge by diff size, scope, and standalone impact; a normal-path bug that violates expectations deserves its ticket.

## Rules

| Rule | Tier | Option | Enforced by |
| --- | --- | --- | --- |
| `maxLines` | `error` | `400` | lint |
| `maxLinesPerFunction` | `warn` | `100` | lint |
| `maxParams` | `warn` | `3` | lint |
| `maxStatements` | `warn` | `15` | lint |
| `complexity` | `warn` | `12` | lint |
| `unusedVars` | `error` | — | lint |
| `explicitAny` | `error` | — | lint |
| `codeStyle` | `error` | — | lint |
| `statementsPerLine` | `error` | — | lint |
| `statementPadding` | `error` | — | lint |
| `importBlock` | `error` | — | lint |
| `fixtureImports` | `error` | — | lint |
| `cycles` | `error` | — | `blueprint inspect` |
| `deadCode` | `error` | — | documentation only |
| `usePrefix` | `error` | — | lint |
| `testFilename` | `error` | — | lint |
| `usePrefixReactivity` | `warn` | — | lint |
| `typedefOnlyFile` | `warn` | — | lint |

The tier is what the enforcing machine does with a violation: `error` fails, `warn` is advisory, `off` is disabled. Which machine differs — `lint` rows fail the project's lint run, `blueprint inspect` rows fail `blueprint inspect` and never appear in a lint run, documentation-only rows are recorded intent with no gate behind them at any tier, and a row reading `nothing` is lint-gated in general but cannot emit on THIS blueprint — the cell says which fact rules it out. Every row reaches only the files a layer glob matches: a declared layer holding no code has nothing that can fail, which is runway rather than protection — `blueprint doctor` reports which of the two this repo has today.

## Naming

| Concept | Convention |
| --- | --- |
| `component` | PascalCase; the implementation file is named after the module |
| `hook` | useX — only when it genuinely uses reactivity |
| `context` | XxxProvider / XxxContext |
