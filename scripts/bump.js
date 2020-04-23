const semver = require('semver');
const path = require('path');
const packageJsonPath = path.resolve(__dirname, '../dist/package.json');
const packageJson = require(packageJsonPath);
const fs = require('fs');
const cp = require('child_process');

const gitHash = cp.spawnSync('git', ['rev-parse', '--short', 'HEAD']).stdout.toString().trim();
const alphaVersion = semver.inc(packageJson.version, 'prerelease', true, gitHash);
packageJson.version = alphaVersion;

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
