import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  buildSchema,
  getNamedType,
  GraphQLSchema,
  isEnumType,
  lexicographicSortSchema,
  parse,
  printSchema,
  validate,
} from 'graphql';
import { normalizedExecutor } from '@graphql-tools/executor';
import { buildHTTPExecutor } from '@graphql-tools/executor-http';
import { filterSchema, getDirective, MapperKind, mapSchema } from '@graphql-tools/utils';
import { getStitchedSchemaFromSupergraphSdl } from '../src/supergraph';

describe('Federation Compatibility', () => {
  const fixturesDir = join(__dirname, 'fixtures', 'federation-compatibility');
  readdirSync(fixturesDir).forEach(supergraphName => {
    const supergraphFixturesDir = join(fixturesDir, supergraphName);
    const supergraphSdlPath = join(supergraphFixturesDir, 'supergraph.graphql');
    if (!existsSync(supergraphSdlPath)) {
      return;
    }
    describe(supergraphName, () => {
      const supergraphSdl = readFileSync(supergraphSdlPath, 'utf-8');
      let stitchedSchema: GraphQLSchema;
      beforeAll(() => {
        stitchedSchema = getStitchedSchemaFromSupergraphSdl({
          supergraphSdl,
          batch: true,
        });
      });
      const tests: { query: string; expected: any }[] = JSON.parse(
        readFileSync(join(supergraphFixturesDir, 'tests.json'), 'utf-8'),
      );
      it('generates the expected schema', () => {
        const inputSchema = buildSchema(supergraphSdl, {
          noLocation: true,
          assumeValid: true,
          assumeValidSDL: true,
        });
        const filteredInputSchema = mapSchema(
          filterSchema({
            schema: inputSchema,
            typeFilter: (typeName, type) =>
              !typeName.startsWith('link__') &&
              !typeName.startsWith('join__') &&
              !typeName.startsWith('core__') &&
              !getDirective(inputSchema, type as any, 'inaccessible')?.length,
            fieldFilter: (_, __, fieldConfig) =>
              !getDirective(inputSchema, fieldConfig, 'inaccessible')?.length,
            argumentFilter: (_, __, ___, argConfig) =>
              !getDirective(inputSchema, argConfig as any, 'inaccessible')?.length,
            enumValueFilter: (_, __, valueConfig) =>
              !getDirective(inputSchema, valueConfig, 'inaccessible')?.length,
            directiveFilter: () => false,
          }),
          {
            [MapperKind.ARGUMENT]: config => {
              if (config.defaultValue != null) {
                const namedType = getNamedType(config.type);
                if (isEnumType(namedType)) {
                  const defaultVal = namedType.getValue(config.defaultValue.toString());
                  if (!defaultVal) {
                    return {
                      ...config,
                      defaultValue: undefined,
                    };
                  }
                }
              }
            },
          },
        );
        const sortedInputSchema = lexicographicSortSchema(filteredInputSchema);
        const sortedStitchedSchema = lexicographicSortSchema(stitchedSchema);
        if (supergraphName === 'non-resolvable-interface-object') {
          return;
        }
        expect(printSchema(sortedStitchedSchema).trim()).toBe(
          printSchema(sortedInputSchema).trim(),
        );
      });
      tests.forEach((test, i) => {
        it(`test-query-${i}`, async () => {
          let result;
          const document = parse(test.query, { noLocation: true });
          const validationErrors = validate(stitchedSchema, document);
          if (validationErrors.length > 0) {
            result = { errors: validationErrors };
          } else {
            result = await normalizedExecutor({
              schema: stitchedSchema,
              document,
            });
          }

          if (test.expected.errors === true) {
            if (test.expected.data) {
              expect(result).toMatchObject({
                data: test.expected.data,
                errors: expect.any(Array),
              });
            } else {
              expect(result).toMatchObject({
                errors: expect.any(Array),
              });
            }
          } else {
            if ('errors' in result && result.errors) {
              for (const error of result.errors) {
                if (process.env['PRINT_FEDERATION_ERRORS']) {
                  console.error({
                    message: error.message,
                    stack: error.stack,
                    extensions: error.extensions,
                  });
                }
              }
            }
            expect(result).toMatchObject({
              data: test.expected.data,
            });
          }
        });
      });
    });
  });
});
