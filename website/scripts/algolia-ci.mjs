import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { indexToAlgolia } from '@guild-docs/algolia';
import { register } from 'esbuild-register/dist/node.js';

register({ extensions: ['.ts', '.tsx'] });

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

const { getRoutes } = require('../routes.ts');

const routes = { ...getRoutes() };

// remove api reference from search for now
delete routes._.docs._.api;

indexToAlgolia({
  routes: [routes],
  source: 'Tools',
  dryMode: process.env.ALGOLIA_DRY_RUN === 'true',
  domain: process.env.SITE_URL,
  lockfilePath: resolve(__dirname, '../algolia-lockfile.json'),
});
