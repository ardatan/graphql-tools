const { readFileSync, writeFileSync } = require('fs');
const { resolve } = require('path');

const pkgPath = resolve(process.cwd(), 'package.json');

const pkg = JSON.parse(
  readFileSync(pkgPath, {
    encoding: 'utf-8',
  })
);

const version = pkg.devDependencies.graphql;

for (const dependency in pkg.resolutions) {
  if (pkg.resolutions.hasOwnProperty(dependency)) {
    pkg.resolutions[dependency] = `^${version}`;
  }
}

writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), {
  encoding: 'utf-8',
});
