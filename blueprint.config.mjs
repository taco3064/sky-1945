import { defineBlueprint, reactPreset } from '@kekkai/blueprint';

const preset = reactPreset({ name: 'SKY-1945', emit: { agents: ['claude'] } });

// Module-first gives the preset's route and feature roles their own positions instead of
// repeating them as inner layers: pages → the reserved `app` module, containers → module-root
// files. Their layer declarations, and every importer reference to them, are dropped.
const ROLE_LAYERS = new Set(['pages', 'containers']);
const importerLayer = (importer) => (typeof importer === 'string' ? importer : importer.layer);
const innerLayers = preset.architecture.layers
  .filter((layer) => !ROLE_LAYERS.has(layer.name))
  .map((layer) =>
    layer.allowedImporters
      ? { ...layer, allowedImporters: layer.allowedImporters.filter((importer) => !ROLE_LAYERS.has(importerLayer(importer))) }
      : layer,
  );

// Module map authored from .claude/docs/game-spec.md — the repository's only
// statement of intent. Section numbers in `does` point back to that spec.
export default defineBlueprint({
  ...preset,
  architecture: {
    ...preset.architecture,
    modules: [
      {
        name: 'app',
        does: 'screen flow (§5): switches title → loadout → stage and keeps the allocation across runs',
        dependsOn: ['title', 'loadout', 'stage'],
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
    layers: [
      ...innerLayers,
      {
        // reactPreset has no framework-free layer; the game rules need one.
        name: 'models',
        does: 'Framework-free state models and their rules: formulas, schedules, state machines, the matter-js collision adapter.',
        mustNot: ['import React', 'touch the DOM outside entity placement'],
        owns: ['matter-js'],
        layout: 'folder',
        entry: 'index',
      },
    ],
  },
  // reactPreset arc: the preset rules are held back until the code is brought in line
  // with them (steps 3 and 4), then this override is removed.
  rules: {},
});
