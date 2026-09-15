import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // A relative base keeps every asset URL working when the build is served from a sub-path.
  base: './',
  plugins: [react()],
})
