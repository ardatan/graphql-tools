import { join } from 'path';

import { Source } from '@graphql-tools/utils';

import { JsonFileLoader } from '../src';
import { runTests } from '../../../testing/utils';

describe('JsonFileLoader', () => {
  const loader = new JsonFileLoader();
  const getPointer = (fileName: string) => {
    return join('packages/loaders/json-file/tests/test-files', fileName);
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
        await expect(canLoad(getPointer('introspection.json'), {})).resolves.toBe(true);
      });

      it('should return true for a valid absolute path', async () => {
        await expect(canLoad(join(process.cwd(), getPointer('introspection.json')), {})).resolves.toBe(true);
      });

      it('should return false if pointer is not a valid path', async () => {
        await expect(canLoad(getPointer('!bad-path.json'), {})).resolves.toBe(false);
      });

      it('should return false if pointer does not end with correct file extension', async () => {
        await expect(canLoad(getPointer('bad-ext.json5'), {})).resolves.toBe(false);
      });

      it('should return false if pointer is for non-existent file', async () => {
        await expect(canLoad(getPointer('bad-file.json'), {})).resolves.toBe(false);
      });
    });
  });

  describe('load', () => {
    runTests({
      async: loader.load.bind(loader),
      sync: loader.loadSync.bind(loader),
    })(load => {
      it('should load introspection data from a .json file', async () => {
        const result: Source = await load(getPointer('introspection.json'), {});
        expect(result.schema).toBeDefined();
      });

      it('should load type definitions from a .json file', async () => {
        const result: Source = await load(getPointer('type-defs.json'), {});
        expect(result.document).toBeDefined();
      });

      it('should load file from absolute path', async () => {
        const result: Source = await load(join(process.cwd(), getPointer('type-defs.json')), {});
        expect(result.document).toBeDefined();
      });

      it('should throw when the file content is malformed', async () => {
        await expect(load(getPointer('malformed.json'), {})).rejects.toThrowError('Unable to read JSON file');
      });
    });
  });
});
