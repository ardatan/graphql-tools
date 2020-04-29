const { writeJSONSync } = require('fs-extra');
const { resolve } = require('path');

const pkgPath = resolve(process.cwd(), './package.json');

const pkg = require(pkgPath);

const version = process.argv[2];

pkg.resolutions = pkg.resolutions || {};
if (!pkg.resolutions.graphql.startsWith(version)){
  pkg.resolutions.graphql = `^${version}`;
}

writeJSONSync(pkgPath, pkg, {
  spaces: 2
});
