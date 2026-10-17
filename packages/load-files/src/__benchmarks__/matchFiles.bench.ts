/**
 * Native fs.glob matchFiles path used by schema/document loaders.
 * Requires a prior `npm run build`. Run with: npm run test:bench
 * Skips when the package under BENCH_PACKAGE_ROOT does not export matchFiles
 * (e.g. master still on globby).
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'vitest';

function writeOpts(name: string): { writeResult: string } | Record<string, never> {
  return process.env['BENCH_WRITE'] ? { writeResult: `./benchmarks/results/${name}.json` } : {};
}

function createFixtureTree(): string {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'match-files-bench-'));
  for (let i = 0; i < 40; i++) {
    const dir = join(fixtureRoot, `mod-${i}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'schema.graphql'), `type Query { f${i}: Int }`);
    writeFileSync(join(dir, 'extra.graphql'), `type Extra${i} { id: ID }`);
    writeFileSync(join(dir, 'skip.txt'), 'nope');
  }
  return fixtureRoot;
}

test('load-files matchFiles benchmarks', async ({ bench }) => {
  const loadFiles = await import('@graphql-tools/load-files');
  const matchFiles = loadFiles.matchFiles as
    ((pattern: string, opts: object) => Promise<string[]>) | undefined;
  const matchFilesSync = loadFiles.matchFilesSync as
    ((pattern: string, opts: object) => string[]) | undefined;

  if (typeof matchFiles !== 'function' || typeof matchFilesSync !== 'function') {
    console.warn('matchFiles/matchFilesSync unavailable in this build; skipping');
    return;
  }

  const fixtureRoot = createFixtureTree();
  try {
    await bench('matchFilesSync **/*.graphql', { ...writeOpts('load-files-matchFilesSync') }, () =>
      matchFilesSync('**/*.graphql', { cwd: fixtureRoot, absolute: false }),
    ).run();

    await bench('matchFiles **/*.graphql', { ...writeOpts('load-files-matchFiles') }, async () =>
      matchFiles('**/*.graphql', { cwd: fixtureRoot, absolute: false }),
    ).run();
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
