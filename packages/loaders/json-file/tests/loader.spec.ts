import { join } from 'path';

import { JsonFileLoader } from '../src/index.js';
import { runTests } from '../../../testing/utils.js';

describe('JsonFileLoader', () => {
  const loader = new JsonFileLoader();
  const getPointer = (fileName: string) => {
    return join('packages/loaders/json-file/tests/test-files', fileName);
  };

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
        const [result] = await load(getPointer('introspection.json'), {});
        expect(result.schema).toBeDefined();
      });

      it('should load type definitions from a .json file', async () => {
        const [result] = await load(getPointer('type-defs.json'), {});
        expect(result.document).toBeDefined();
      });

      it('should load file from absolute path', async () => {
        const [result] = await load(join(process.cwd(), getPointer('type-defs.json')), {});
        expect(result.document).toBeDefined();
      });

      it('should load multiple files from glob expression', async () => {
        const results = await load(join(process.cwd(), getPointer('*.json')), {});
        expect(results).toHaveLength(2);
      });

      it('should throw when the file content is malformed', async () => {
        await expect(load(getPointer('failing/malformed.json'), {})).rejects.toThrowError('Unable to read JSON file');
      });

      it('should skip file it cannot load', async () => {
        const result = await load(getPointer('id_do_not_exist.json'), {});
        expect(result).toEqual([]);
      });

      it('should raise an error when the glob matches valid and invalid schema files', async () => {
        const result = load(getPointer('{type-defs,failing/malformed}.json'), {});
        await expect(result).rejects.toThrow();
      });
    });
  });
});
