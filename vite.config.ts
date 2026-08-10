import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Mirrors compilerOptions.paths in tsconfig.app.json. Both sides are
  // required: TypeScript resolves the alias for the editor and `tsc`, Vite
  // resolves it for the bundle.
  resolve: {
    alias: { '~app': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
