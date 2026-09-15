import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // A relative base lets the production build be served from any sub-path (game-spec 1.3).
  base: './',
  plugins: [react()],
  resolve: {
    // A root-relative string keeps the alias statically readable by `blueprint doctor`.
    alias: { '~app': '/src' },
  },
})
