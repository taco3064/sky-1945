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
        name: 'title',
        does: 'title screen (§6): logo, breathing prompt, any key or pointer down continues',
      },
      {
        name: 'loadout',
        does: 'loadout screen and allocation (§7, §14.1): the 10-point SPEED / POWER split and the multipliers it yields',
      },
      {
        name: 'stage',
        does: 'play screen (§8–§10, §12.4): viewport fit, entity drawings and placement, speed lines, HUD, overlays, keyboard and pointer controls, touch stick',
        dependsOn: ['battle', 'loadout'],
      },
      {
        name: 'battle',
        does: 'run rules and simulation (§12, §13): field space, bullets, bursts, player, enemy waves and paths, boss, hit detection, rounds, frame-rate window, and the React adapter of a run',
        dependsOn: ['loadout'],
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
