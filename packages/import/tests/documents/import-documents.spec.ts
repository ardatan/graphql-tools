import '../../../testing/to-be-similar-gql-doc';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, relative } from 'path';
import { parse, print, Source } from 'graphql';
import { processImport, VisitedFilesMap } from '../../src/index.js';

const importDocuments = (documentPath: string) => print(processImport(documentPath, __dirname));

describe('import in documents', () => {
  it('should get documents with default imports properly', async () => {
    const document = importDocuments('./import-test/default/a.graphql');

    expect(document).toBeSimilarGqlDoc(/* GraphQL */ `
      query FooQuery {
        foo {
          ...FooFragment
        }
      }

      fragment FooFragment on Foo {
        bar {
          ...BarFragment
        }
      }

      fragment BarFragment on Bar {
        baz
      }
    `);
  });

  it('should keep leading comments on imported documents', () => {
    const document = processImport('./import-test/default/with-comments.graphql', __dirname);
    expect(document.loc?.source.body).toMatch(/#\s*eslint-disable-next-line/);
    expect(print(document)).toBeSimilarGqlDoc(/* GraphQL */ `
      query Foo {
        ...BarFragment
      }

      fragment BarFragment on Bar {
        baz
      }
    `);
  });

  it('should get documents with specific imports properly', async () => {
    const document = importDocuments('./import-test/specific/a.graphql');

    expect(document).toBeSimilarGqlDoc(/* GraphQL */ `
      query FooQuery {
        foo {
          ...FooFragment
        }
      }

      fragment FooFragment on Foo {
        bar {
          ...BarFragment
        }
      }

      fragment BarFragment on Bar {
        baz
      }
    `);
  });

  it('does not reprint and re-parse the assembled document (#5616 Clinic path)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'import-5616-'));
    const types = Array.from({ length: 40 }, (_, i) => `type T${i} { id: ID }`).join('\n');
    writeFileSync(join(dir, 'types.graphql'), `${types}\n`);
    writeFileSync(
      join(dir, 'root.graphql'),
      `# import * from "./types.graphql"\n\ntype Query { x: T0 }\n`,
    );

    const visitedFiles: VisitedFilesMap = new Map();
    const document = processImport(join(dir, 'root.graphql'), dir, undefined, visitedFiles);

    const collected: Array<(typeof document.definitions)[number]> = [];
    const seen = new Set();
    for (const fileDefs of visitedFiles.values()) {
      for (const defs of fileDefs.values()) {
        for (const def of defs) {
          if (!seen.has(def)) {
            seen.add(def);
            collected.push(def);
          }
        }
      }
    }

    // The issue profile: print every definition, concatenate, parse again.
    let sdl = '';
    for (const def of collected) {
      sdl += print(def) + '\n';
    }
    const reprinted = parse(new Source(sdl, join(dir, 'root.graphql')));

    expect(document.definitions.length).toBeGreaterThan(1);
    for (const def of document.definitions) {
      expect(seen.has(def)).toBe(true);
    }
    expect(reprinted.definitions.some(def => seen.has(def))).toBe(false);
  });

  it('keeps original definition nodes instead of reprinting them', () => {
    const visitedFiles: VisitedFilesMap = new Map();
    const document = processImport(
      './import-test/default/a.graphql',
      __dirname,
      undefined,
      visitedFiles,
    );
    const collected = new Set();
    for (const fileDefs of visitedFiles.values()) {
      for (const defs of fileDefs.values()) {
        for (const def of defs) {
          collected.add(def);
        }
      }
    }
    expect(document.definitions.length).toBeGreaterThan(0);
    for (const def of document.definitions) {
      expect(collected.has(def)).toBe(true);
    }
  });

  it('should accept a map as fourth argument for users to get visited file paths with details', () => {
    const visitedFiles: VisitedFilesMap = new Map();
    processImport('./import-test/default/a.graphql', __dirname, undefined, visitedFiles);
    const relativePaths = Array.from(visitedFiles.keys())
      .map(absPath => relative(__dirname, absPath))
      .map(relPath => relPath.replace(/\\/g, '/'));
    expect(relativePaths).toStrictEqual([
      'import-test/default/a.graphql',
      'import-test/default/b.graphql',
      'import-test/default/c.graphql',
    ]);
  });

  it('should import fragment with nested fragments', () => {
    const document = importDocuments('./import-test/default/d.gql');

    expect(document).toBeSimilarGqlDoc(/* GraphQL */ `
      query User {
        user {
          ...UserFields
        }
      }

      fragment UserFields on User {
        ...AnotherUserFields
        posts {
          ...PostFields
        }
      }

      fragment AnotherUserFields on User {
        firstName
      }

      fragment PostFields on Post {
        title
        ...AnotherPostFields
      }

      fragment AnotherPostFields on Post {
        content
        ...YetAnotherPostFields
      }

      fragment YetAnotherPostFields on Post {
        content
      }
    `);
  });
});
