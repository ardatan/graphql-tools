import { join } from 'path';

import { Source } from '@graphql-tools/utils';

import { GraphQLFileLoader } from '../src';
import { runTests } from '../../../testing/utils';

describe('GraphQLFileLoader', () => {
  const loader = new GraphQLFileLoader();
  const getPointer = (fileName: string) => {
    return join('packages/loaders/graphql-file/tests/test-files', fileName);
  };

  describe('loaderId', () => {
    it('should return a loader id', () => {
      expect(loader.loaderId()).toBeDefined();
    });
  });

  describe('canLoad', () => {
    runTests({
      async: loader.canLoad.bind(loader),
      sync: loader.canLoadSync.bind(loader),
    })(canLoad => {
      it('should return true for a valid pointer', async () => {
        await expect(canLoad(getPointer('type-defs.graphql'), {})).resolves.toBe(true);
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
        const result: Source = await load(getPointer('type-defs.graphql'), {});
        expect(result.document).toBeDefined();
      });

      it('should load file from absolute path', async () => {
        const result: Source = await load(join(process.cwd(), getPointer('type-defs.graphql')), {});
        expect(result.document).toBeDefined();
      });

      it('should load file with #import expression', async () => {
        const result: Source = await load(getPointer('type-defs-with-import.graphql'), {});
        expect(result.document?.definitions.length).toBe(2);
      });
    });
  });
});
