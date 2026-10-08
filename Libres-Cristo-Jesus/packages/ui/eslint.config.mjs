import sharedConfig from '@lcj/config/eslint/base.mjs';

export default [...sharedConfig, { ignores: ['dist/**'] }];
