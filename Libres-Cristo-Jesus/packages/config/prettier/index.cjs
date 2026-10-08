/**
 * Shared Prettier configuration for the LCJ Connect monorepo.
 * Every app and package resolves this same set of rules through the
 * root `.prettierrc.cjs`, which re-exports this file. Do not create a
 * second Prettier config anywhere else in the repo.
 */
module.exports = {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  endOfLine: 'lf',
  arrowParens: 'always',
};
