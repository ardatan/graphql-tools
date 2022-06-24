import '../../../testing/to-be-similar-gql-doc';
import { processImport, VisitedFilesMap } from '../../src/index.js';
import { print } from 'graphql';
import { relative } from 'path';

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
