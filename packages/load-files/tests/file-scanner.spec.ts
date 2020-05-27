import { loadFilesSync, loadFiles } from '@graphql-tools/load-files';
import { print } from 'graphql';

function testSchemaDir({ path, expected, note, extensions, ignoreIndex }: { path: string; expected: any; note: string; extensions?: string[] | null; ignoreIndex?: boolean }) {
  it(`SYNC: should return the correct schema results for path: ${path} (${note})`, () => {
    const options = {
      ignoreIndex,
      globOptions: {
        cwd: __dirname
      },
      requireMethod: jest.requireActual,
    };
    const result = loadFilesSync(path, extensions ? { ...options, extensions } : options);

    expect(result.length).toBe(expected.length);
    expect(result.map(res => {
      if (res.kind === 'Document') {
        res = print(res);
      }
      return stripWhitespaces(res);
    })).toEqual(expected.map(stripWhitespaces));
  });

  it(`ASYNC: should return the correct schema results for path: ${path} (${note})`, async () => {
    const options = {
      ignoreIndex,
      globOptions: {
        cwd: __dirname
      },
      requireMethod: jest.requireActual,
    };
    const result = await loadFiles(path, extensions ? { ...options, extensions } : options);

    expect(result.length).toBe(expected.length);
    expect(result.map(res => {
      if (res.kind === 'Document') {
        res = print(res);
      }
      return stripWhitespaces(res);
    })).toEqual(expected.map(stripWhitespaces));
  });
}

function testResolversDir({ path, expected, note, extensions, compareValue, ignoreIndex }: { path: string; expected: any; note: string; extensions?: string[]; compareValue?: boolean; ignoreIndex?: boolean }) {
  if (typeof compareValue === 'undefined') {
    compareValue = true;
  }

  it(`SYNC: should return the correct resolvers results for path: ${path} (${note})`, () => {
    const options = {
      ignoreIndex,
      globOptions: {
        cwd: __dirname
      },
      requireMethod: jest.requireActual,
    };
    const result = loadFilesSync(path, extensions ? { ...options, extensions } : options);

    expect(result.length).toBe(expected.length);

    if (compareValue) {
      expect(result).toEqual(expected);
    }
  });

  it(`ASYNC: should return the correct resolvers results for path: ${path} (${note})`, async () => {
    const options = {
      ignoreIndex,
      globOptions: {
        cwd: __dirname
      },
      requireMethod: jest.requireActual,
    };
    const result = await loadFiles(path, extensions ? { ...options, extensions } : options);

    expect(result.length).toBe(expected.length);

    if (compareValue) {
      expect(result).toEqual(expected);
    }
  });
}

function stripWhitespaces(str: any): string {
  return str.toString().replace(/\s+/g, ' ').trim();
}

describe('file scanner', function() {
  describe('schema', () => {
    const schemaContent = `type MyType { f: String }`;
    testSchemaDir({
      path: './test-assets/1/*.graphql',
      expected: [schemaContent],
      note: 'minimatch pattern',
    });
    testSchemaDir({
      path: './test-assets/1',
      expected: [schemaContent],
      note: 'one file',
    });
    testSchemaDir({
      path: './test-assets/2',
      expected: [schemaContent, schemaContent, schemaContent],
      note: 'multiple files',
    });
    testSchemaDir({
      path: './test-assets/3',
      expected: [schemaContent, schemaContent, schemaContent],
      note: 'recursive',
    });
    testSchemaDir({
      path: './test-assets/4',
      expected: [schemaContent],
      note: 'custom extension',
      extensions: ['schema'],
    });
    testSchemaDir({
      path: './test-assets/5',
      expected: [schemaContent, schemaContent],
      note: 'custom extensions',
      extensions: ['schema', 'myschema'],
    });
    testSchemaDir({
      path: './test-assets/10',
      expected: [schemaContent, schemaContent, schemaContent],
      note: 'code files with gql tag',
      extensions: ['js'],
    });
    testSchemaDir({
      path: './test-assets/10',
      expected: [schemaContent, schemaContent, schemaContent],
      note: 'code files with gql tag',
      extensions: ['js'],
    });
    testSchemaDir({
      path: './test-assets/12',
      expected: [schemaContent],
      note: 'should ignore index on demand',
      extensions: ['graphql'],
      ignoreIndex: true,
    });
    testSchemaDir({
      path: './test-assets/12',
      expected: [schemaContent, `type IndexType { f: Int }`],
      note: 'should include index by default',
      extensions: ['graphql'],
    });
  });

  describe('resolvers', () => {
    testResolversDir({
      path: './test-assets/6/*.resolvers.js',
      expected: [{ MyType: { f: 1 } }],
      note: 'minimatch pattern',
    });
    testResolversDir({
      path: './test-assets/6',
      expected: [{ MyType: { f: 1 } }],
      note: 'one file',
    });
    testResolversDir({
      path: './test-assets/7',
      expected: [{ MyType: { f: 1 } }, { MyType: { f: 2 } }],
      note: 'multiple files',
    });
    testResolversDir({
      path: './test-assets/8',
      expected: [{ MyType: { f: 1 } }],
      note: 'default export',
    });
    testResolversDir({
      path: './test-assets/9',
      expected: [{ MyType: { f: 1 } }, { MyType: { f: 2 } }],
      note: 'named exports',
    });
    //
    // XXX: I have no idea what this suppose to test
    //
    // testResolversDir({
    //   path: './test-assets/11',
    //   expected: new Array(2).fill(''),
    //   note: 'ignored extensions',
    //   extensions: null,
    //   compareValue: false,
    // });
    testResolversDir({
      path: './test-assets/12',
      expected: [
        {
          MyType: {
            f: '12',
          },
        },
        {
          IndexType: {
            f: '12',
          },
        },
      ],
      note: 'includes index files but only if it matches extensions',
      extensions: ['js'],
      compareValue: true,
    });
    testResolversDir({
      path: './test-assets/12',
      expected: [
        {
          MyType: {
            f: '12',
          },
        },
      ],
      note: 'ingore index files',
      extensions: ['js'],
      compareValue: true,
      ignoreIndex: true,
    });
  });
});
