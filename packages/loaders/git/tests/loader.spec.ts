import { execSync } from 'child_process';
import * as path from 'path';
import { runTests } from '../../../testing/utils.js';
import { GitLoader } from '../src/index.js';

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
        expect(result.document).toMatchObject({
          definitions: [
            {
              description: undefined,
              directives: [],
              fields: [
                {
                  arguments: [],
                  description: undefined,
                  directives: [],
                  kind: 'FieldDefinition',
                  loc: {
                    end: 28,
                    start: 15,
                  },
                  name: {
                    kind: 'Name',
                    loc: {
                      end: 20,
                      start: 15,
                    },
                    value: 'hello',
                  },
                  type: {
                    kind: 'NamedType',
                    loc: {
                      end: 28,
                      start: 22,
                    },
                    name: {
                      kind: 'Name',
                      loc: {
                        end: 28,
                        start: 22,
                      },
                      value: 'String',
                    },
                  },
                },
              ],
              interfaces: [],
              kind: 'ObjectTypeDefinition',
              loc: {
                end: 30,
                start: 0,
              },
              name: {
                kind: 'Name',
                loc: {
                  end: 10,
                  start: 5,
                },
                value: 'Query',
              },
            },
          ],
          kind: 'Document',
          loc: {
            end: 30,
            start: 0,
          },
        });
      });

      it('should throw when the file does not exist', async () => {
        await expect(load(getPointer('wrong-filename.graphql'), {})).rejects.toThrow(
          'Unable to load file from git',
        );
      });

      it('should simply ignore a non git path', async () => {
        const result = await load('./pluckable.ts', {});
        expect(result).toEqual([]);
      });

      it("should work when loading glob paths that start with './'", async () => {
        const saveCwd = process.cwd();
        process.chdir(path.resolve(__dirname, 'test-files', 'a'));

        const [result] = await load(`git:${lastCommit}:./**/*.graphql`, {});
        expect(result.document).toMatchObject({
          definitions: [
            {
              description: undefined,
              directives: [],
              fields: [
                {
                  arguments: [],
                  description: undefined,
                  directives: [],
                  kind: 'FieldDefinition',
                  loc: {
                    end: 28,
                    start: 15,
                  },
                  name: {
                    kind: 'Name',
                    loc: {
                      end: 20,
                      start: 15,
                    },
                    value: 'hello',
                  },
                  type: {
                    kind: 'NamedType',
                    loc: {
                      end: 28,
                      start: 22,
                    },
                    name: {
                      kind: 'Name',
                      loc: {
                        end: 28,
                        start: 22,
                      },
                      value: 'String',
                    },
                  },
                },
              ],
              interfaces: [],
              kind: 'ObjectTypeDefinition',
              loc: {
                end: 30,
                start: 0,
              },
              name: {
                kind: 'Name',
                loc: {
                  end: 10,
                  start: 5,
                },
                value: 'Query',
              },
            },
          ],
          kind: 'Document',
          loc: {
            end: 31,
            start: 0,
          },
        });

        process.chdir(saveCwd);
      });
    });
  });
});
