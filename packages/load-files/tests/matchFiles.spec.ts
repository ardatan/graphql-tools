import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { matchFiles, matchFilesSync } from '../src/matchFiles.js';

describe('matchFiles', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'match-files-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('keeps negative extglobs as include patterns', async () => {
    writeFileSync(join(dir, 'schema.graphql'), 'type Query { a: String }');
    writeFileSync(join(dir, 'schema.test.graphql'), 'type Query { b: String }');

    const asyncMatches = await matchFiles('!(*.test).graphql', { cwd: dir, absolute: false });
    const syncMatches = matchFilesSync('!(*.test).graphql', { cwd: dir, absolute: false });

    expect(asyncMatches.sort()).toEqual(['schema.graphql']);
    expect(syncMatches.sort()).toEqual(['schema.graphql']);
  });

  it('still treats whole-pattern !negation as an ignore', async () => {
    writeFileSync(join(dir, 'keep.graphql'), 'type Query { a: String }');
    writeFileSync(join(dir, 'drop.graphql'), 'type Query { b: String }');

    const asyncMatches = await matchFiles(['*.graphql', '!drop.graphql'], {
      cwd: dir,
      absolute: false,
    });
    const syncMatches = matchFilesSync(['*.graphql', '!drop.graphql'], {
      cwd: dir,
      absolute: false,
    });

    expect(asyncMatches.sort()).toEqual(['keep.graphql']);
    expect(syncMatches.sort()).toEqual(['keep.graphql']);
  });

  it('includes symlinked files when onlyFiles is enabled', async () => {
    const target = join(dir, 'real.graphql');
    writeFileSync(target, 'type Query { a: String }');
    symlinkSync(target, join(dir, 'link.graphql'));

    const asyncMatches = await matchFiles('*.graphql', { cwd: dir, absolute: false });
    const syncMatches = matchFilesSync('*.graphql', { cwd: dir, absolute: false });

    expect(asyncMatches.sort()).toEqual(['link.graphql', 'real.graphql']);
    expect(syncMatches.sort()).toEqual(['link.graphql', 'real.graphql']);
  });

  it('follows directory symlinks while matching', async () => {
    const outside = mkdtempSync(join(tmpdir(), 'match-files-out-'));
    try {
      writeFileSync(join(outside, 'schema.graphql'), 'type Query { a: String }');
      symlinkSync(outside, join(dir, 'linked'));

      const asyncMatches = await matchFiles('**/*.graphql', { cwd: dir, absolute: false });
      const syncMatches = matchFilesSync('**/*.graphql', { cwd: dir, absolute: false });

      expect(asyncMatches.sort()).toEqual(['linked/schema.graphql']);
      expect(syncMatches.sort()).toEqual(['linked/schema.graphql']);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it('only re-roots symlinks under the pattern prefix', async () => {
    const outsideSrc = mkdtempSync(join(tmpdir(), 'match-files-src-'));
    const outsideVendor = mkdtempSync(join(tmpdir(), 'match-files-vendor-'));
    try {
      mkdirSync(join(dir, 'src'));
      writeFileSync(join(outsideSrc, 'in.graphql'), 'type Query { a: String }');
      writeFileSync(join(outsideVendor, 'out.graphql'), 'type Query { b: String }');
      symlinkSync(outsideSrc, join(dir, 'src', 'linked'));
      symlinkSync(outsideVendor, join(dir, 'vendor'));

      const asyncMatches = await matchFiles('src/**/*.graphql', { cwd: dir, absolute: false });
      const syncMatches = matchFilesSync('src/**/*.graphql', { cwd: dir, absolute: false });

      expect(asyncMatches.sort()).toEqual(['src/linked/in.graphql']);
      expect(syncMatches.sort()).toEqual(['src/linked/in.graphql']);
    } finally {
      rmSync(outsideSrc, { recursive: true, force: true });
      rmSync(outsideVendor, { recursive: true, force: true });
    }
  });

  it('preserves backslashes in filenames on POSIX', async () => {
    if (process.platform === 'win32') {
      return;
    }

    const weirdName = 'schema\\fragment.graphql';
    writeFileSync(join(dir, weirdName), 'type Query { a: String }');

    const asyncMatches = await matchFiles('*.graphql', { cwd: dir, absolute: false });
    const syncMatches = matchFilesSync('*.graphql', { cwd: dir, absolute: false });

    expect(asyncMatches).toEqual([weirdName]);
    expect(syncMatches).toEqual([weirdName]);
  });
});
