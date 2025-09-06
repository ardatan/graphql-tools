const { writeFileSync } = require('fs');
const { resolve } = require('path');
const { argv, cwd } = require('process');

const pkgPath = resolve(cwd(), './package.json');

const pkg = require(pkgPath);

const version = argv[2];

pkg.overrides = pkg.overrides || {};
if (pkg.overrides.graphql.startsWith(version)) {
  console.info(`GraphQL v${version} is match! Skipping.`);
} else {
  const npmVersion = version.includes('-') ? version : `^${version}`;
  pkg.overrides.graphql = npmVersion;
  pkg.devDependencies.graphql = npmVersion;

  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
}
