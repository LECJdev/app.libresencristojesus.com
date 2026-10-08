import sharedConfig from './eslint/base.mjs';

export default [...sharedConfig, { ignores: ['dist/**'] }];
