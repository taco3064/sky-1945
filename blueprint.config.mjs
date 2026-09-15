import { defineBlueprint, reactPreset } from '@kekkai/blueprint';

/**
 * sky-1945 — a vertical bullet-hell shooter, governed by @kekkai/blueprint
 * from the first commit.
 *
 * The preset's `principles`, `componentShape`, `playbook` and `rules` are
 * spread in UNCHANGED. They are what this project exists to observe: what the
 * contract does to a 60fps game loop. Editing them to suit the game would end
 * the experiment.
 *
 * Only `architecture` is replaced, in three deliberate ways:
 *
 * 1. `services` became `engine`. The game has no network. What it does have
 *    is a physics world and an animation loop — and those deserve exactly the
 *    isolation `services` was giving to the HTTP client. The two `owns`
 *    entries are the load-bearing part: no component can reach matter-js, and
 *    no file outside an `engine` layer can call `requestAnimationFrame`.
 *
 * 2. `zustand` dropped from the `hooks` layer's `owns`. The preset declares
 *    it; this project will not install it. A contract naming a package the
 *    repo does not have describes nothing.
 *
 * 3. `pages` and `containers` became modules. Each screen is a module whose
 *    root holds the screen itself, and the one page is the reserved `app`
 *    module. The layers left repeat inside every other module.
 */
export default defineBlueprint({
  ...reactPreset({ name: 'sky-1945', emit: { agents: ['claude'] } }),
  architecture: {
    alias: '~app',
    modules: [
      {
        name: 'app',
        does: 'Mounts the game shell: holds the run and picks the screen for it. Holds no game logic and stacks no components directly.',
        dependsOn: ['session', 'title', 'loadout', 'stage'],
      },
      {
        name: 'session',
        does: 'The run state machine: title, loadout, playing, paused, game over.',
      },
      {
        name: 'title',
        does: 'The opening screen.',
      },
      {
        name: 'loadout',
        does: 'Spends ten points across speed and power before a run.',
        dependsOn: ['stage'],
      },
      {
        name: 'stage',
        does: 'The flight: the simulation, and the field and HUD drawn from it.',
      },
    ],
    layers: [
      {
        name: 'components',
        layout: 'folder',
        does: 'Presentational only — aircraft, bullets, bars. Props and refs, nothing else.',
        mustNot: ['own game state', 'read the engine', 'open an animation loop'],
      },
      {
        name: 'hooks',
        layout: 'folder',
        does: 'Adapts the engine simulation to React. The only layer that may inject context.',
        owns: [{ package: 'react', imports: ['useContext'] }],
      },
      {
        name: 'contexts',
        layout: 'folder',
        does: 'Defines and provides Context / Provider only — carries the world instance down.',
        owns: [{ package: 'react', imports: ['createContext'] }],
        allowedImporters: [{ layer: 'hooks', selfOnly: true, description: 'Context only' }],
      },
      {
        name: 'engine',
        layout: 'folder',
        does: 'Pure TS simulation: physics world, collision, bullet patterns, damage, scheduling. Never imports React.',
        owns: ['matter-js', { global: 'requestAnimationFrame' }],
        allowedImporters: ['hooks', 'contexts'],
      },
    ],
    /*
     * `*.fixtures.ts` counts as a test file, which is what lets `src/fixtures/`
     * exist without being an architecture module.
     *
     * Test support is not architecture: declaring a module for it would put it in
     * the module table and the agent contract. Widening what counts as a test file
     * says the true thing instead — these are test files that happen not to be
     * suites. The folder stays at the source root because the fixture ban is
     * emitted against `~app/fixtures`.
     *
     * The default is the first entry alone; the second is this project's addition.
     */
    testFiles: ['**/*.{test,spec}.{ts,tsx}', '**/*.fixtures.ts'],
    naming: {
      component: 'PascalCase; the implementation file is named after the module',
      hook: 'useX — only when it genuinely uses reactivity',
      context: 'XxxProvider / XxxContext',
    },
  },
});
