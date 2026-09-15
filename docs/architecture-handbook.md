# SKY-1945 — Architecture Handbook

> Generated from `blueprint.config` by `@kekkai/blueprint` — edit the blueprint, not this file.

## Architecture

Code flows one way: each layer may import only from the layers below it. Upstream imports and same-module same-layer imports through the alias are barred.

```mermaid
flowchart TD
  subgraph m0["stage"]
    m0_l0["components"]
    m0_l1["hooks"]
    m0_l2["lib"]
    m0_l0 -.-> m0_l1
    m0_l1 -.-> m0_l2
  end
  subgraph m1["battle"]
    m1_l0["components"]
    m1_l1["hooks"]
    m1_l2["lib"]
    m1_l0 -.-> m1_l1
    m1_l1 -.-> m1_l2
  end
  subgraph m2["title"]
    m2_l0["components"]
    m2_l1["hooks"]
    m2_l2["lib"]
    m2_l0 -.-> m2_l1
    m2_l1 -.-> m2_l2
  end
  subgraph m3["loadout"]
    m3_l0["components"]
    m3_l1["hooks"]
    m3_l2["lib"]
    m3_l0 -.-> m3_l1
    m3_l1 -.-> m3_l2
  end
  subgraph m4["controls"]
    m4_l0["components"]
    m4_l1["hooks"]
    m4_l2["lib"]
    m4_l0 -.-> m4_l1
    m4_l1 -.-> m4_l2
  end
  subgraph m5["player"]
    m5_l0["components"]
    m5_l1["hooks"]
    m5_l2["lib"]
    m5_l0 -.-> m5_l1
    m5_l1 -.-> m5_l2
  end
  subgraph m6["enemies"]
    m6_l0["components"]
    m6_l1["hooks"]
    m6_l2["lib"]
    m6_l0 -.-> m6_l1
    m6_l1 -.-> m6_l2
  end
  subgraph m7["boss"]
    m7_l0["components"]
    m7_l1["hooks"]
    m7_l2["lib"]
    m7_l0 -.-> m7_l1
    m7_l1 -.-> m7_l2
  end
  subgraph m8["bullets"]
    m8_l0["components"]
    m8_l1["hooks"]
    m8_l2["lib"]
    m8_l0 -.-> m8_l1
    m8_l1 -.-> m8_l2
  end
  subgraph m9["bursts"]
    m9_l0["components"]
    m9_l1["hooks"]
    m9_l2["lib"]
    m9_l0 -.-> m9_l1
    m9_l1 -.-> m9_l2
  end
  subgraph m10["field"]
    m10_l0["components"]
    m10_l1["hooks"]
    m10_l2["lib"]
    m10_l0 -.-> m10_l1
    m10_l1 -.-> m10_l2
  end
```

> **How to read the diagram**: a **solid** edge is a declared importer relation (its label carries the description and/or `selfOnly` — depend on it, never re-export it). A **dotted** edge only records declaration order: adjacent layers are not necessarily related. Reachability is transitive — a layer may import **any** layer below it in the flow, whether or not an edge is drawn, unless the target narrows its importers (`allowedImporters`).

### Modules

| Module | Responsibility | Direct dependencies |
| --- | --- | --- |
| `stage` | play screen (§8): viewport fit and the scaled field element, speed lines, entity paint order, touch surface, HUD and pause / game-over overlays | `battle`, `controls`, `loadout`, `player`, `enemies`, `boss`, `bullets`, `bursts`, `field` |
| `battle` | run simulation (§12.2, §12.5, §12.10–§12.12, §13): frame loop and four-pass step, rounds and difficulty, lives and relaunch, hit detection and contact resolution, frame-rate window | `player`, `enemies`, `boss`, `bullets`, `bursts`, `loadout`, `field` |
| `title` | title screen (§6): logo, breathing prompt, any key or pointer down continues | — |
| `loadout` | loadout screen and allocation (§7, §14.1): the 10-point SPEED / POWER split and the multipliers it yields | — |
| `controls` | player input (§8.8, §12.4): arrow-key and pointer steering direction, roll requests, pause key, touch stick | — |
| `player` | ALLY-01 (§9.1, §9.2, §12.3): craft and life-icon drawings, fly-in, steering, auto-fire volleys, barrel roll and protection | `bullets`, `loadout`, `field` |
| `enemies` | enemy aircraft (§9.3–§9.6, §12.6–§12.8): ENEMY-S / M / L drawings, wave and squad schedule, flight paths, firing | `bullets`, `field` |
| `boss` | boss (§8.6, §9.7, §10.3, §12.9): rolled size, entry and patrol, stance machine, seeded attack order, volleys, ram, beam, health bar and tells | `bullets`, `field` |
| `bullets` | bullets of both sides (§10.1, §10.2, §12.8): drawings, straight / spread / radial volleys, constant-velocity flight, off-field removal | `field` |
| `bursts` | wreck bursts (§10.4): ally / enemy palettes, small / large sizes, flash and shards, simulated lifetime | `field` |
| `field` | play-field coordinate space (§0, §8.4, §12.1): 540 × 960 u bounds, headings, outside-by-margin test, entity placement transform and lean | — |

Every module reuses the shared layer contract below. Module dependencies are transitive: a module may import itself and every downstream module reachable through `dependsOn`; declaration order grants no permission. An absent layer folder is runway.

### Layers

| Layer | Responsibility | Must not | Owns |
| --- | --- | --- | --- |
| `components` | CSS-drawn React elements of the module — screens, craft, bullets, HUD parts | hold simulation rules — they belong in lib | `react` |
| `hooks` | React wiring of the module — frame loop, element measuring, input listeners, per-frame placement | — | `react` |
| `lib` | framework-free rules and data — formulas, schedules, state machines, the matter-js collision adapter | import React | `matter-js` |

## Unit shape

A unit is the code item inside a layer. Folder units expose only their entry; file units are one file each.

| Layer | Unit layout | Entry |
| --- | --- | --- |
| `components` | `folder` | `index` |
| `hooks` | `file` | — |
| `lib` | `file` | — |

## Import discipline

These boundaries are verified alive in the project ESLint run — one blueprint drives both:

- **Module reachability** — a module may import only itself and modules reachable through its declared `dependsOn` edges. The inner layer flow must also allow the import.
- **One-way only** — a layer imports only from the layers below it; upstream imports are errors.
- **Canonical boundary spelling** — use `~app`, the source-root alias, whenever an import crosses a declared layer or module boundary. Additional aliases are resolved for diagnosis, but rejected as alternate boundary spellings.
- **No same-module same-layer imports via the alias** — use a relative path. File units may reach sibling files; folder units may reach a sibling only through its entry. Extract shared logic down to a lower layer when neither unit owns it.
- **Entry-only** — import a folder unit through its `index`, never its internals.
- **Dynamic parity** — a dynamic import whose target reduces to a proven string follows the same alias, flow, and unit-entry rules. Runtime-dependent targets remain explicitly unverified; they are never invented as legal graph dependencies.
- **No redundant relative segments** (`./../`, `././`) that bypass the rules.
- **Ownership** — packages and globals are restricted to their owning layer (see the *Owns* column above).
