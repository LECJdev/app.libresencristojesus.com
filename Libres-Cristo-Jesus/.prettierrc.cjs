// Single source of truth for Prettier rules lives in packages/config/prettier.
// This root file only re-exports it so every tool that auto-discovers
// `.prettierrc.*` (editors, lint-staged, `prettier --write .`) finds it
// without needing an explicit --config flag.
module.exports = require('./packages/config/prettier/index.cjs');
