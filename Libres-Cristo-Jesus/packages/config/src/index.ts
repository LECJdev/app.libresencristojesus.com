/**
 * Placeholder entry point for the @lcj/config package.
 *
 * The actual shared configuration is NOT consumed through this module —
 * it lives in the sibling folders below and is imported directly by path
 * from each app/package:
 *
 *  - eslint/base.mjs        shared ESLint flat-config rules
 *  - prettier/index.cjs     shared Prettier options
 *  - typescript/*.json      shared tsconfig base + framework variants
 *
 * This file only exists so the package itself is a valid, compilable
 * TypeScript package like every other workspace member.
 */
export const CONFIG_PACKAGE_NAME = '@lcj/config';
