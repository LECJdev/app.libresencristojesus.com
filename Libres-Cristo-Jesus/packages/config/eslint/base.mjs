import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Shared ESLint flat-config rules for every TypeScript app/package in the
 * monorepo. Framework-specific configs (Next.js in apps/web, NestJS in
 * apps/api) import this array and layer their own plugins on top instead
 * of redefining these rules.
 *
 * Intentionally uses the non type-checked `recommended` ruleset (not
 * `recommendedTypeChecked`) so it stays usable from any package without
 * requiring a `parserOptions.project` wired up. Consumers that want
 * type-aware linting add `tseslint.configs.recommendedTypeChecked`
 * themselves on top of this base (see apps/api/eslint.config.mjs).
 */
const baseConfig = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Absolute project rule: never `any` (see Documentos/23, Documentos/22).
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
);

export default baseConfig;
