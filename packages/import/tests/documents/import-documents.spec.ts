import '../../../testing/to-be-similar-gql-doc';
import { processImport } from '../../src';
import { print } from 'graphql';

const importDocuments = (documentPath: string) => print(processImport(documentPath, __dirname));

describe('import in documents', () => {
      it('should get documents with default imports properly', async () => {
        const document = importDocuments('./import-test/default/a.graphql');

        expect(document).toBeSimilarGqlDoc(/* GraphQL */`
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

      expect(document).toBeSimilarGqlDoc(/* GraphQL */`
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
