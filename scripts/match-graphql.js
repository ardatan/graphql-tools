const { writeFileSync } = require('fs');
const { resolve } = require('path');

const pkgPath = resolve(process.cwd(), './package.json');

const pkg = require(pkgPath);

const version = process.argv[2];

pkg.resolutions = pkg.resolutions || {};
if (pkg.resolutions.graphql.startsWith(version)){
  console.info(`GraphQL v${version} already installed! Skipping.`)
}

pkg.resolutions.graphql = `^${version}`;

writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
