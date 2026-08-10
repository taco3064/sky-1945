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
