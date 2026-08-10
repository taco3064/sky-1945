import { defineBlueprint, reactPreset } from '@kekkai/blueprint';

/**
 * sky-1945 — a vertical bullet-hell shooter, governed by @kekkai/blueprint
 * from the first commit.
 *
 * The preset's `principles`, `componentShape`, `playbook` and `rules` are
 * spread in UNCHANGED. They are what this project exists to observe: what an
 * architecture contract written for CRUD front ends grows when the domain is
 * a 60fps game loop. Editing them to suit the game would end the experiment.
 *
 * Only `architecture` is replaced, in two deliberate ways:
 *
 * 1. `services` became `engine`. The game has no network. What it does have
 *    is a physics world and an animation loop — and those deserve exactly the
 *    isolation `services` was giving to the HTTP client. The two `owns`
 *    entries are the load-bearing part: no component can reach matter-js, and
 *    the repo has exactly one animation loop that lint can prove.
 *
 * 2. `zustand` dropped from the `hooks` layer's `owns`. The preset declares
 *    it; this project will not install it. A contract naming a package the
 *    repo does not have describes nothing.
 */
export default defineBlueprint({
  ...reactPreset({ name: 'sky-1945', emit: { agents: ['claude'] } }),
  architecture: {
    alias: '~app',
    layers: [
      {
        name: 'pages',
        does: 'Mounts the game shell.',
        mustNot: ['hold game logic', 'stack components directly'],
      },
      {
        name: 'containers',
        does: 'Screens: title, loadout, stage, HUD. Assembles components, owns local state, drives a round.',
      },
      {
        name: 'components',
        does: 'Presentational only — aircraft, bullets, bars. Props and refs, nothing else.',
        mustNot: ['own game state', 'read the engine', 'open an animation loop'],
      },
      {
        name: 'hooks',
        does: 'Adapts the engine simulation to React. The only layer that may inject context.',
        owns: [{ package: 'react', imports: ['useContext'] }],
      },
      {
        name: 'contexts',
        does: 'Defines and provides Context / Provider only — carries the world instance down.',
        owns: [{ package: 'react', imports: ['createContext'] }],
        allowedImporters: [
          { layer: 'containers', description: 'Provider only' },
          { layer: 'hooks', selfOnly: true, description: 'Context only' },
        ],
      },
      {
        name: 'engine',
        does: 'Pure TS simulation: physics world, collision, bullet patterns, damage, scheduling. Never imports React.',
        owns: ['matter-js', { global: 'requestAnimationFrame' }],
        allowedImporters: ['containers', 'hooks', 'contexts'],
      },
    ],
    module: { layout: 'folder', entry: 'index', private: ['hooks', 'styles', 'types'] },
    naming: {
      component: 'PascalCase; the implementation file is named after the module',
      hook: 'useX — only when it genuinely uses reactivity',
      context: 'XxxProvider / XxxContext',
    },
  },
});
