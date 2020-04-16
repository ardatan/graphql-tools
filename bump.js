const semver = require('semver');
const packageJson = require('./dist/package.json');
const fs = require('fs');
const cp = require('child_process');

const gitHash = cp.spawnSync('git', ['rev-parse', '--short', 'HEAD']).stdout.toString().trim();
const alphaVersion = semver.inc(packageJson.version, 'prerelease', true, gitHash);
packageJson.version = alphaVersion;

fs.writeFileSync('./dist/package.json', JSON.stringify(packageJson, null, 2));
