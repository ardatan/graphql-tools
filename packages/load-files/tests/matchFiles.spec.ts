import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
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
});
