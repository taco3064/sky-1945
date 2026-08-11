import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// `defineConfig` comes from vitest/config rather than vite so the test block
// below type-checks — it is the same Vite config otherwise, and the alias is
// declared once for both the bundle and the suite.
export default defineConfig({
  plugins: [react()],
  // Mirrors compilerOptions.paths in tsconfig.app.json. Both sides are
  // required: TypeScript resolves the alias for the editor and `tsc`, Vite
  // resolves it for the bundle and for Vitest.
  resolve: {
    alias: { '~app': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    /*
     * Twenty seconds, against vitest's default of five.
     *
     * The engine's suite drives whole runs through fake timers — one case simulates
     * two and a half minutes of play, several simulate a full round — and a round is
     * thousands of frames at four collision passes each. Half a second on a
     * developer's machine, several on a shared CI runner, and the gap between those
     * two numbers is not fixed: it moves with whatever else the runner is doing.
     *
     * Both times this bit, it bit *after* a merge or on an unrelated branch, which
     * is the tell that the threshold was wrong rather than the tests. Raising it
     * globally beats adding a timeout per case as each one happens to be the slowest
     * on the day — and twenty is still far below anything that has actually hung, so
     * a genuine deadlock still fails rather than waiting out the job.
     */
    testTimeout: 20_000,
    // Unmounts what each test rendered. Not optional with `globals` off —
    // see the comment in the file.
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      // engine and hooks only, on purpose. The engine is pure functions and
      // state machines — cheap to test and the tests actually hold something.
      // hooks are tested for their state transitions. containers and
      // components are presentational: a unit test cannot tell you whether an
      // aircraft looks right, and the browser can.
      include: ['src/engine/**', 'src/hooks/**'],
      thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
    },
  },
});
