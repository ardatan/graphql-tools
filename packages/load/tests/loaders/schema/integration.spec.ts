import {
  buildSchema,
  GraphQLEnumType,
  GraphQLObjectType,
  GraphQLSchema,
  printSchema,
} from 'graphql';
import { CodeFileLoader } from '@graphql-tools/code-file-loader';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { loadSchema, loadSchemaSync } from '@graphql-tools/load';
import { runTests, testIf, useMonorepo } from '../../../../testing/utils.js';
import '../../../../testing/to-be-similar-gql-doc';
import { join } from 'path';

const monorepo = useMonorepo({
  dirname: __dirname,
});

describe('loadSchema', () => {
  monorepo.correctCWD();

  runTests({
    async: loadSchema,
    sync: loadSchemaSync,
  })(load => {
    // Babel 8 parse failures on invalid .ts retain the Jest isolate under `--detectLeaks`.
    testIf(!process.env['LEAK_TEST'])(
      'should throw when all files are invalid and unable to load it',
      async () => {
        const schemaPath = './test-files/error.ts';
        try {
          await load(schemaPath, {
            loaders: [new CodeFileLoader()],
            cwd: __dirname,
          });
          expect(true).toBeFalsy(); // should throw
        } catch (e: any) {
          // Single loader failures are wrapped in AggregateError with context (#7406)
          expect(e.toString()).toContain('Failed to find any GraphQL type definitions');
          expect(e.toString()).toMatch(/Unterminated template|SyntaxError/);
        }
      },
    );

    test('should work with ts files and without globs correctly', async () => {
      const schemaPath = './test-files/schema-dir/type-defs/graphql-tag.ts';
      const schema = await load(schemaPath, {
        cwd: __dirname,
        loaders: [new CodeFileLoader()],
      });
      expect(schema.getTypeMap()['User']).toBeDefined();
      expect(schema.getTypeMap()['Query']).toBeDefined();
    });

    test('should work with graphql single file', async () => {
      const schemaPath = './test-files/schema-dir/user.graphql';
      const schema = await load(schemaPath, {
        cwd: __dirname,
        loaders: [new GraphQLFileLoader()],
      });

      expect(schema.getTypeMap()['User']).toBeDefined();
    });

    test('import and merge Query types from few different files', async () => {
      const schema = await load(
        '../../../../import/tests/schema/fixtures/multiple-root/*/schema.graphql',
        {
          loaders: [new GraphQLFileLoader()],
          cwd: __dirname,
        },
      );
      const schemaStr = printSchema(schema);

      expect(schemaStr).toBeSimilarGqlDoc(/* GraphQL */ `
        type Query {
          a: A
          b: B
          c: C
        }

        type A {
          text: String
        }

        type B {
          text: String
        }

        type C {
          text: String
        }
      `);
    });

    test('should sort the final schema if "sort" option provided', async () => {
      const schemaPath = './test-files/schema-dir/non-sorted.graphql';
      const schema = await load(schemaPath, {
        cwd: __dirname,
        loaders: [new GraphQLFileLoader()],
        sort: true,
      });
      expect(printSchema(schema)).toBeSimilarGqlDoc(/* GraphQL */ `
        type A {
          b: String
          s: String
        }

        type Query {
          a: String
          d: String
          z: String
        }

        type User {
          a: String
          aa: String
        }
      `);
    });

    test('should sort fields and enum values when sort is true', async () => {
      const schema = await load('./test-files/schema-dir/non-sorted-with-enum.graphql', {
        cwd: __dirname,
        loaders: [new GraphQLFileLoader()],
        sort: true,
      });

      expect(queryFieldNames(schema)).toEqual(['a', 'd', 'day', 'z']);
      expect(enumValueNames(schema, 'DayOfWeek')).toEqual([
        'FRIDAY',
        'MONDAY',
        'SATURDAY',
        'SUNDAY',
        'THURSDAY',
        'TUESDAY',
        'WEDNESDAY',
      ]);
    });

    test('should sort only types when sortMode is typesOnly', async () => {
      const schema = await load('./test-files/schema-dir/non-sorted-with-enum.graphql', {
        cwd: __dirname,
        loaders: [new GraphQLFileLoader()],
        sort: true,
        sortMode: 'typesOnly',
      });

      expect(queryFieldNames(schema)).toEqual(['d', 'z', 'a', 'day']);
      expect(enumValueNames(schema, 'DayOfWeek')).toEqual([
        'SUNDAY',
        'MONDAY',
        'TUESDAY',
        'WEDNESDAY',
        'THURSDAY',
        'FRIDAY',
        'SATURDAY',
      ]);
    });

    test('should ignore sortMode when sort is not enabled', async () => {
      const schema = await load('./test-files/schema-dir/non-sorted-with-enum.graphql', {
        cwd: __dirname,
        loaders: [new GraphQLFileLoader()],
        sortMode: 'typesOnly',
      });

      expect(queryFieldNames(schema)).toEqual(['d', 'z', 'a', 'day']);
      expect(enumValueNames(schema, 'DayOfWeek')).toEqual([
        'SUNDAY',
        'MONDAY',
        'TUESDAY',
        'WEDNESDAY',
        'THURSDAY',
        'FRIDAY',
        'SATURDAY',
      ]);
    });

    test('should add schemas from options.schemas to generated schema', async () => {
      const schemaPath = './test-files/schema-dir/non-sorted.graphql';
      const schema = await load(schemaPath, {
        cwd: __dirname,
        loaders: [new GraphQLFileLoader()],
        sort: true,
        schemas: [
          buildSchema(/* GraphQL */ `
            scalar DateTime

            type B {
              c: String
              d: DateTime
            }

            type Query {
              b: B
            }
          `),
        ],
      });
      expect(printSchema(schema)).toBeSimilarGqlDoc(/* GraphQL */ `
        scalar DateTime

        type A {
          b: String
          s: String
        }

        type Query {
          a: String
          b: B
          d: String
          z: String
        }

        type B {
          c: String
          d: DateTime
        }

        type User {
          a: String
          aa: String
        }
      `);
    });
    test(`should pass custom loader context to the custom loader correctly`, async () => {
      const customLoaderContext = {
        loaderType: 'schema',
      };
      const pointerOptions = {
        loader: join(__dirname, '../../custom-loader.js'),
        fooFieldName: 'myFooField',
      };
      const result = await load(
        {
          pointer: pointerOptions,
        },
        {
          loaders: [],
          customLoaderContext,
        },
      );
      expect(result).toBeInstanceOf(GraphQLSchema);
      expect(result.getQueryType()?.getFields()?.['myFooField']).toBeDefined();
    });
    // Dynamic `import()` of ESM loaders retains the isolate under Jest `--detectLeaks`.
    testIf(!process.env['LEAK_TEST'])(
      `should load an ESM custom schema loader (#6656)`,
      async () => {
        const result = await load(
          {
            pointer: {
              loader: join(__dirname, '../../custom-loader.mjs'),
              fooFieldName: 'myFooField',
            },
          },
          {
            loaders: [],
            customLoaderContext: {
              loaderType: 'schema',
            },
          },
        );
        expect(result).toBeInstanceOf(GraphQLSchema);
        expect(result.getQueryType()?.getFields()?.['myFooField']).toBeDefined();
      },
    );
  });
});

function queryFieldNames(schema: GraphQLSchema): string[] {
  return Object.keys((schema.getType('Query') as GraphQLObjectType).getFields());
}

function enumValueNames(schema: GraphQLSchema, typeName: string): string[] {
  return (schema.getType(typeName) as GraphQLEnumType).getValues().map(value => value.name);
}
