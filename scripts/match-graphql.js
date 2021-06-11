const { writeFileSync } = require('fs');
const { resolve } = require('path');
const { argv, cwd } = require('process');

const pkgPath = resolve(cwd(), './package.json');

const pkg = require(pkgPath);

const versionOrTag = argv[2];

pkg.resolutions = pkg.resolutions || {};
if (pkg.resolutions.graphql.startsWith(versionOrTag)){
  console.info(`GraphQL v${versionOrTag} already installed! Skipping.`)
}

pkg.resolutions.graphql = typeof versionOrTag === 'number' ? `^${versionOrTag}`: versionOrTag;

writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
