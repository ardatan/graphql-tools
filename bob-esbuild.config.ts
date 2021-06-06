import { resolve } from 'path';

export const config: import('bob-esbuild').BobConfig = {
  tsc: {
    dirs: ['packages/*', 'packages/loaders/*'],
    tsconfig: resolve(__dirname, 'tsconfig.build.json'),
  },
  skipAutoTSCBuild: false,
  verbose: false,
};
