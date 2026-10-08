import { FlatCompat } from '@eslint/eslintrc';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharedConfig from '@lcj/config/eslint/base.mjs';

// eslint-config-next@15 still ships the legacy (non-flat) shareable-config
// shape (`module.exports = { extends, plugins, rules, ... }`), so it needs
// FlatCompat to bridge it into this flat config — there is no native
// "eslint-config-next/core-web-vitals" flat export until Next 16.
const compat = new FlatCompat({
  baseDirectory: path.dirname(fileURLToPath(import.meta.url)),
});

const eslintConfig = [
  ...sharedConfig,
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['.next/**', 'out/**', 'build/**', 'next-env.d.ts'],
  },
];

export default eslintConfig;
