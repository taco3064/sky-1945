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

/**
 * Type declarations belong in a module's `types.ts` — see #34.
 *
 * A local rule object rather than a `no-restricted-syntax` entry, and that is
 * not a style preference. `no-restricted-syntax` is one of the rules blueprint
 * manages, and this project genuinely uses it: `contexts` declares
 * `selfOnly`, so the re-export ban is emitted through it over
 * `src/hooks/**`. A second `no-restricted-syntax` entry matching those files
 * would REPLACE blueprint's version for them rather than merge with it, and
 * the ban would vanish while lint stayed green. Its own rule id cannot
 * collide, so this route overrides nothing.
 *
 * `blueprint doctor` is what proves that claim — its "emitted rules survive
 * the eslint config" check resolves the config per layer and compares the
 * selfOnly selectors against what the blueprint expects.
 */
const typesInTypesFile = {
  meta: {
    type: 'problem',
    docs: { description: "A top-level type declaration belongs in its module's types.ts." },
    messages: {
      misplaced:
        '\n🚫 "{{name}}" is a top-level {{kind}} outside `types.ts` — move it into the'
        + " module's `types.ts` and import it back with `import type`.",
    },
  },
  create(context) {
    return {
      // Program body only: a type declared inside a function or a block is
      // local to an expression, not a module's vocabulary.
      Program(program) {
        for (const statement of program.body) {
          const node
            = statement.type === 'ExportNamedDeclaration'
            || statement.type === 'ExportDefaultDeclaration'
              ? statement.declaration
              : statement;

          if (
            node?.type === 'TSInterfaceDeclaration'
            || node?.type === 'TSTypeAliasDeclaration'
          ) {
            context.report({
              node,
              messageId: 'misplaced',
              data: {
                name: node.id.name,
                kind: node.type === 'TSInterfaceDeclaration' ? 'interface' : 'type alias',
              },
            });
          }
        }
      },
    };
  },
};

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
  // The lock for #34. The exemptions are decided here rather than discovered:
  //
  // - `types.ts` itself, which is the whole point.
  // - Test files, on the same two globs the blueprint counts as tests
  //   (`architecture.testFiles`, whose second entry this project added for
  //   `src/fixtures/`). Blueprint exempts tests from structure by design, and a
  //   test needing a local type should not have to route it through a module's
  //   public vocabulary. No test file declares a type today — this is about the
  //   next one.
  //
  // Deliberately NOT exempt: `src/main.tsx` and `src/test-setup.ts`. They sit
  // outside every layer net, but they are also wiring — if either ever wants a
  // type declaration, that is a signal the code belongs in a layer, not a
  // signal this list is missing an entry.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/types.ts', 'src/**/*.{test,spec}.{ts,tsx}', 'src/**/*.fixtures.ts'],
    plugins: { local: { rules: { 'types-in-types-file': typesInTypesFile } } },
    rules: { 'local/types-in-types-file': 'error' },
  },
];
