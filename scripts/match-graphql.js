const { writeFileSync } = require('fs');
const { resolve } = require('path');
const { argv, cwd } = require('process');

const pkgPath = resolve(cwd(), './package.json');

const pkg = require(pkgPath);

const version = argv[2];

pkg.resolutions = pkg.resolutions || {};
if (pkg.resolutions.graphql.startsWith(version)) {
  console.info(`GraphQL v${version} is match! Skipping.`);
  return;
}

const npmVersion = version.includes('-') ? version : `^${version}`;
pkg.resolutions.graphql = npmVersion;
pkg.devDependencies.graphql = npmVersion;

writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
