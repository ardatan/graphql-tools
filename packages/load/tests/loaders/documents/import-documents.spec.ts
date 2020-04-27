import { loadDocuments, loadDocumentsSync } from '@graphql-tools/load';
import { join } from 'path';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { print } from 'graphql';
import '../../../../testing/to-be-similar-gql-doc';
import { runTests } from '../../../../testing/utils';

describe('import in documents', () => {
    runTests({
      async: loadDocuments,
      sync: loadDocumentsSync
    })(load => {
      it('should get documents with default imports properly', async () => {
        const [{ document }] = await load(join(__dirname, './import-test/default/a.graphql'), {
          loaders: [new GraphQLFileLoader()],
        });

        expect(print(document)).toBeSimilarGqlDoc(/* GraphQL */`
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
      const [{ document }] = await load(join(__dirname, './import-test/specific/a.graphql'), {
        loaders: [new GraphQLFileLoader()]
      });

      expect(print(document)).toBeSimilarGqlDoc(/* GraphQL */`
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
  });
});
