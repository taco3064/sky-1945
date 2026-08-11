// Hand-written, on purpose. The banner that marked this file as
// blueprint-owned is gone, so `blueprint init` no longer regenerates it in
// place — it reports instead, and anything new the generator would have added
// has to be merged in by hand. That is the price of the React block at the
// bottom: oxlint used to hold those two rules, and with oxlint removed there
// was nowhere else in the repo for them to live.
//
// What did NOT change: `emitLint(blueprint)` is still spread in below, so every
// structural rule the contract defines still comes from blueprint.config.mjs at
// runtime. The single source of truth for structure is untouched — this file
// gained two React rules, not an opinion about layers.
import comments from '@eslint-community/eslint-plugin-eslint-comments';
import { emitLint } from '@kekkai/blueprint';
import stylistic from '@stylistic/eslint-plugin';
import imports from 'eslint-plugin-import-x';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

import blueprint from './blueprint.config.mjs';

export default [
  // Parser setup — needed when THIS file is the live config. Merging
  // into an existing config that already wires parsers? Skip these
  // blocks — copying them re-parses files your config already handles.
  // A skipped block leaves its parser package installed: leave it — a
  // later init treats it as required for the stack and re-installs it.
  // "Already wires" includes presets that do it internally: extending
  // tseslint.configs.recommended (or any typescript-eslint preset)
  // means the TS parser is wired even if no languageOptions.parser
  // line is visible. Your own lint passing on .ts/.tsx confirms it —
  // as far as the files it actually parsed. On a repo whose layers hold
  // no files yet, a green lint proves this config loads, not that the
  // parser reaches layer files; it becomes that proof with the first
  // file in a layer. Skipping the block is still right either way: a
  // parser wired for the stack is wired for files that do not exist yet.
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    languageOptions: { parser: tseslint.parser },
  },
  // This jsx block matters only while .js/.jsx source exists — on a
  // TS-only repo it is dormant, and skipping it in a merge loses nothing.
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
  },
  ...emitLint(blueprint, { typescript: tseslint.plugin, stylistic, imports }),
  // The anti-bypass guard — NOT part of emitLint. A silent, unexplained
  // eslint-disable is exactly how an agent routes around every rule
  // above, so these two rules force each disable to carry a scope and a
  // -- reason. Default: ADOPT. On a brownfield config, annotate the
  // existing bare disables (or ledger them via --suppress-all) rather
  // than dropping the block; dropping is the exception — only when the
  // team already owns a disable discipline, and say so in the report.
  // Its plugin (@eslint-community/eslint-plugin-eslint-comments) is
  // installed by init on every path; dropping the block? Remove that
  // dependency with it. When merging, its position relative to the
  // emitLint spread does not matter — the rule sets never intersect.
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
  // The two rules oxlint used to hold, at the tiers it ran them at. They are
  // React's rules rather than the blueprint's — the contract has nothing to say
  // about hook call order, and blueprint emits neither.
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      // A warning, not an error, and constants may be exported beside a
      // component. It disagrees with the blueprint's context module shape on
      // purpose — GameContext exports its context and its provider together and
      // carries the disable that says why.
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
];
