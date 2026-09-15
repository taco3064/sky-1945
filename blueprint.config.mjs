import { defineBlueprint } from '@kekkai/blueprint';

// Module map authored from .claude/docs/game-spec.md — the repository's only
// statement of intent. Section numbers in `does` point back to that spec.
// src/main.tsx and src/App.tsx stay source-root wiring: the screen flow (§5)
// composes title → loadout → stage there.
export default defineBlueprint({
  name: 'SKY-1945',
  framework: 'react',
  architecture: {
    alias: '~app',
    modules: [
      {
        name: 'stage',
        does: 'play screen (§8): viewport fit and the scaled field element, speed lines, entity paint order, touch surface, HUD and pause / game-over overlays',
        dependsOn: ['battle', 'controls', 'loadout', 'player', 'enemies', 'boss', 'bullets', 'bursts', 'field'],
      },
      {
        name: 'battle',
        does: 'run simulation (§12.2, §12.5, §12.10–§12.12, §13): frame loop and four-pass step, rounds and difficulty, lives and relaunch, hit detection and contact resolution, frame-rate window',
        dependsOn: ['player', 'enemies', 'boss', 'bullets', 'bursts', 'loadout', 'field'],
      },
      {
        name: 'title',
        does: 'title screen (§6): logo, breathing prompt, any key or pointer down continues',
      },
      {
        name: 'loadout',
        does: 'loadout screen and allocation (§7, §14.1): the 10-point SPEED / POWER split and the multipliers it yields',
      },
      {
        name: 'controls',
        does: 'player input (§8.8, §12.4): arrow-key and pointer steering direction, roll requests, pause key, touch stick',
      },
      {
        name: 'player',
        does: 'ALLY-01 (§9.1, §9.2, §12.3): craft and life-icon drawings, fly-in, steering, auto-fire volleys, barrel roll and protection',
        dependsOn: ['bullets', 'loadout', 'field'],
      },
      {
        name: 'enemies',
        does: 'enemy aircraft (§9.3–§9.6, §12.6–§12.8): ENEMY-S / M / L drawings, wave and squad schedule, flight paths, firing',
        dependsOn: ['bullets', 'field'],
      },
      {
        name: 'boss',
        does: 'boss (§8.6, §9.7, §10.3, §12.9): rolled size, entry and patrol, stance machine, seeded attack order, volleys, ram, beam, health bar and tells',
        dependsOn: ['bullets', 'field'],
      },
      {
        name: 'bullets',
        does: 'bullets of both sides (§10.1, §10.2, §12.8): drawings, straight / spread / radial volleys, constant-velocity flight, off-field removal',
        dependsOn: ['field'],
      },
      {
        name: 'bursts',
        does: 'wreck bursts (§10.4): ally / enemy palettes, small / large sizes, flash and shards, simulated lifetime',
        dependsOn: ['field'],
      },
      {
        name: 'field',
        does: 'play-field coordinate space (§0, §8.4, §12.1): 540 × 960 u bounds, headings, outside-by-margin test, entity placement transform and lean',
      },
    ],
    // Inner technical layers repeated below each module; order is the one-way flow.
    layers: [
      {
        name: 'components',
        does: 'CSS-drawn React elements of the module — screens, craft, bullets, HUD parts',
        mustNot: ['hold simulation rules — they belong in lib'],
        owns: ['react'],
        layout: 'folder',
        entry: 'index',
      },
      {
        name: 'hooks',
        does: 'React wiring of the module — frame loop, element measuring, input listeners, per-frame placement',
        owns: ['react'],
        layout: 'file',
      },
      {
        name: 'lib',
        does: 'framework-free rules and data — formulas, schedules, state machines, the matter-js collision adapter',
        mustNot: ['import React'],
        owns: ['matter-js'],
        layout: 'file',
      },
    ],
  },
  emit: {
    agents: ['claude'],
  },
});
