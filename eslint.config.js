import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import comments from '@eslint-community/eslint-plugin-eslint-comments'
import stylistic from '@stylistic/eslint-plugin'
import imports from 'eslint-plugin-import-x'
import { emitLint } from '@kekkai/blueprint'
import { defineConfig, globalIgnores } from 'eslint/config'
import blueprint from './blueprint.config.mjs'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  // Architecture rules compiled from blueprint.config.mjs. Keep this spread
  // after the presets above: later flat-config entries win.
  ...emitLint(blueprint, { typescript: tseslint.plugin, stylistic, imports }),
  // Anti-bypass guard: every eslint-disable must be scoped and carry a reason.
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    plugins: {
      '@eslint-community/eslint-comments': comments,
    },
    rules: {
      '@eslint-community/eslint-comments/no-unlimited-disable': 'error',
      '@eslint-community/eslint-comments/require-description': 'error',
    },
  },
])
