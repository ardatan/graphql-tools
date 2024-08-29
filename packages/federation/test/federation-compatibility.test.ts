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
import { ApolloGateway } from '@apollo/gateway';
import { normalizedExecutor } from '@graphql-tools/executor';
import {
  ExecutionResult,
  filterSchema,
  getDirective,
  MapperKind,
  mapSchema,
} from '@graphql-tools/utils';
import { getStitchedSchemaFromSupergraphSdl } from '../src/supergraph';

describe.skip('Federation Compatibility', () => {
  if (!existsSync(join(__dirname, 'fixtures', 'federation-compatibility'))) {
    console.warn('Make sure you fetched the fixtures from the API first');
    it.skip('skipping tests', () => {});
    return;
  }
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
      // let apolloExecutor: Executor;
      // let apolloSubgraphCalls: Record<string, number> = {};
      let stitchingSubgraphCalls: Record<string, number> = {};
      let apolloGW: ApolloGateway;
      beforeAll(async () => {
        stitchedSchema = getStitchedSchemaFromSupergraphSdl({
          supergraphSdl,
          onSubschemaConfig(subschemaConfig) {
            const actualExecutor = subschemaConfig.executor;
            subschemaConfig.executor = function tracedExecutor(execReq) {
              stitchingSubgraphCalls[subschemaConfig.name.toLowerCase()] =
                (stitchingSubgraphCalls[subschemaConfig.name] || 0) + 1;
              return actualExecutor(execReq);
            };
          },
          batch: true,
        });
        /*         apolloGW = new ApolloGateway({
          supergraphSdl,
          buildService({ name, url }) {
            const subgraphName = name;
            const actualService = new RemoteGraphQLDataSource({ url });
            return {
              process(options) {
                apolloSubgraphCalls[subgraphName.toLowerCase()] =
                  (apolloSubgraphCalls[subgraphName.toLowerCase()] || 0) + 1;
                return actualService.process(options);
              },
            };
          },
        });
        const loadedGw = await apolloGW.load();
        apolloExecutor = function apolloExecutor(execReq) {
          const operationAST = getOperationAST(execReq.document, execReq.operationName);
          if (!operationAST) {
            throw new Error('Operation not found');
          }
          const printedDoc = print(execReq.document);
          return loadedGw.executor({
            request: {},
            logger: console,
            schema: loadedGw.schema,
            schemaHash: 'hash' as any,
            context: execReq.context as any,
            cache: new Map() as any,
            queryHash: 'hash' as any,
            document: execReq.document,
            source: printedDoc,
            operationName: execReq.operationName || null,
            operation: operationAST,
            metrics: {},
            overallCachePolicy: {},
          }) as ExecutionResult;
        }; */
      });
      afterAll(async () => {
        await apolloGW?.stop?.();
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
        // For Stitching's sanity, if an interface is not implemented by any object type, it should be converted to an object type
        // You can see the difference when you commented this condition out.
        if (supergraphName === 'non-resolvable-interface-object') {
          return;
        }
        expect(printSchema(sortedStitchedSchema).trim()).toBe(
          printSchema(sortedInputSchema).trim(),
        );
      });
      tests.forEach((test, i) => {
        describe(`test-query-${i}`, () => {
          let result: ExecutionResult;
          beforeAll(async () => {
            // apolloSubgraphCalls = {};
            stitchingSubgraphCalls = {};
            const document = parse(test.query, { noLocation: true });
            const validationErrors = validate(stitchedSchema, document);
            if (validationErrors.length > 0) {
              result = {
                errors: validationErrors,
              };
            } else {
              result = (await normalizedExecutor({
                schema: stitchedSchema,
                document,
              })) as ExecutionResult;
            }
          });
          it('gives the correct result', () => {
            const received = {
              data: result.data ?? null,
              errors: !!result.errors?.length,
            };

            const expected = {
              data: test.expected.data ?? null,
              errors: test.expected.errors ?? false,
            };

            try {
              expect(received).toEqual(expected);
            } catch (e) {
              result.errors?.forEach(err => {
                console.error(err);
              });
              throw e;
            }
          });
        });
      });
    });
  });
});
