import { execSync } from 'child_process';

import { GitLoader } from '../src/index.js';
import { runTests } from '../../../testing/utils.js';

describe('GitLoader', () => {
  const loader = new GitLoader();
  const lastCommit = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).replace(/\n/g, '');
  const getPointer = (fileName: string) => {
    return `git:${lastCommit}:packages/loaders/git/tests/test-files/${fileName}`;
  };

  describe('canLoad', () => {
    runTests({
      async: loader.canLoad.bind(loader),
      sync: loader.canLoadSync.bind(loader),
    })(canLoad => {
      it('should return true for a valid pointer', async () => {
        await expect(canLoad(getPointer('some-file.graphql'))).resolves.toBe(true);
      });

      it('should return false if pointer does not begin with "git:"', async () => {
        await expect(canLoad(getPointer('some-file.graphql').substring(4))).resolves.toBe(false);
      });

      it('should return false if pointer is not a string', async () => {
        await expect(canLoad(42 as any)).resolves.toBe(false);
      });
    });
  });

  describe('load', () => {
    runTests({
      async: loader.load.bind(loader),
      sync: loader.loadSync.bind(loader),
    })(load => {
      it('should load document from a .graphql file', async () => {
        const [result] = await load(getPointer('type-defs.graphql'), {});
        expect(result.document).toBeDefined();
      });

      it('should load introspection data from a .json file', async () => {
        const [result] = await load(getPointer('introspection.json'), {});
        expect(result.schema).toBeDefined();
      });

      it('should load type definitions from a .json file', async () => {
        const [result] = await load(getPointer('type-defs.json'), {});
        expect(result.document).toBeDefined();
      });

      it('should load type definitions from a pluckable file', async () => {
        const [result] = await load(getPointer('pluckable.ts'), {});
        expect(result.document).toMatchSnapshot();
      });

      it('should throw when the file does not exist', async () => {
        await expect(load(getPointer('wrong-filename.graphql'), {})).rejects.toThrowError(
          'Unable to load file from git'
        );
      });

      it('should simply ignore a non git path', async () => {
        const result = await load('./pluckable.ts', {});
        expect(result).toEqual([]);
      });
    });
  });
});
