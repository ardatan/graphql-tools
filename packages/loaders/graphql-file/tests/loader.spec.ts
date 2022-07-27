import { join } from 'path';

import { print } from 'graphql';

import { GraphQLFileLoader } from '../src/index.js';
import { runTests } from '../../../testing/utils.js';
import '../../../testing/to-be-similar-gql-doc';

describe('GraphQLFileLoader', () => {
  const loader = new GraphQLFileLoader();
  const getPointer = (fileName: string) => {
    return join('packages/loaders/graphql-file/tests/test-files', fileName);
  };

  describe('canLoad', () => {
    runTests({
      async: loader.canLoad.bind(loader),
      sync: loader.canLoadSync.bind(loader),
    })(canLoad => {
      it('should return true for a valid pointer', async () => {
        await expect(canLoad(getPointer('type-defs.graphql'), {})).resolves.toBe(true);
        await expect(canLoad(getPointer('typedefs-&-copy.graphql'), {})).resolves.toBe(true);
      });

      it('should return true for a valid absolute path', async () => {
        await expect(canLoad(join(process.cwd(), getPointer('type-defs.graphql')), {})).resolves.toBe(true);
      });

      it('should return false if pointer is not a valid path', async () => {
        await expect(canLoad(getPointer('!bad-path.graphql'), {})).resolves.toBe(false);
      });

      it('should return false if pointer does not end with correct file extension', async () => {
        await expect(canLoad(getPointer('bad-ext.garphql'), {})).resolves.toBe(false);
      });

      it('should return false if pointer is for non-existent file', async () => {
        await expect(canLoad(getPointer('bad-file.graphql'), {})).resolves.toBe(false);
      });
    });
  });

  describe('load', () => {
    runTests({
      async: loader.load.bind(loader),
      sync: loader.loadSync.bind(loader),
    })(load => {
      it('should load type definitions from a .graphql file', async () => {
        const [result] = await load(getPointer('type-defs.graphql'), {});
        expect(result.document).toBeDefined();
      });

      it('should load file from absolute path', async () => {
        const [result] = await load(join(process.cwd(), getPointer('type-defs.graphql')), {});
        expect(result.document).toBeDefined();
      });

      it('should load type definitions document with #import expression', async () => {
        const [result] = await load(getPointer('type-defs-with-import.graphql'), {});
        expect(print(result.document!)).toBeSimilarGqlDoc(/* GraphQL */ `
          type Query {
            a: A
          }

          type A {
            b: String
          }
        `);
      });

      it('should load executable document with #import expression', async () => {
        const [result] = await load(getPointer('executable.graphql'), {});
        expect(print(result.document!)).toBeSimilarGqlDoc(/* GraphQL */ `
          query MyQuery {
            a {
              ...AFragment
            }
          }

          fragment AFragment on A {
            b
          }
        `);
      });

      it('should raise an error when for an invalid schema file', async () => {
        const result = load(getPointer('type-defs-with-failing-import.graphql'), {});
        await expect(result).rejects.toThrow();
      });

      it('should raise an error when the glob matches valid and invalid schema files', async () => {
        const result = load(getPointer('type-defs-with-{import,failing-import}.graphql'), {});
        await expect(result).rejects.toThrow();
      });
    });
  });
});
