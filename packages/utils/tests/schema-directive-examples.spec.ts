import { defaultFieldResolver, graphql, GraphQLSchema } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { getDirective, MapperKind, mapSchema } from '../src/index.js';

describe('schema directive examples', () => {
  test('applies stacked directive wrappers in transformer order, not SDL order (issue #5424)', async () => {
    function labelDirective(directiveName: string): (schema: GraphQLSchema) => GraphQLSchema {
      return schema =>
        mapSchema(schema, {
          [MapperKind.OBJECT_FIELD]: fieldConfig => {
            const directive = getDirective(schema, fieldConfig, directiveName)?.[0];
            if (directive) {
              const { resolve = defaultFieldResolver } = fieldConfig;
              fieldConfig.resolve = async function (source, args, context, info) {
                const result = await resolve(source, args, context, info);
                return `${directiveName}(${result})`;
              };
              return fieldConfig;
            }
          },
        });
    }

    function schemaWithSdl(fieldDirectives: string) {
      return makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          directive @first on FIELD_DEFINITION
          directive @second on FIELD_DEFINITION
          type Query {
            hello: String ${fieldDirectives}
          }
        `,
        resolvers: {
          Query: {
            hello() {
              return 'ok';
            },
          },
        },
      });
    }

    const firstThenSecond = [labelDirective('first'), labelDirective('second')];
    const secondThenFirst = [labelDirective('second'), labelDirective('first')];

    async function run(
      fieldDirectives: string,
      transformers: Array<(schema: GraphQLSchema) => GraphQLSchema>,
    ) {
      const schema = transformers.reduce((acc, curr) => curr(acc), schemaWithSdl(fieldDirectives));
      const { data } = await graphql({
        schema,
        source: '{ hello }',
      });
      return data;
    }

    await expect(run('@first @second', firstThenSecond)).resolves.toEqual({
      hello: 'second(first(ok))',
    });
    await expect(run('@second @first', firstThenSecond)).resolves.toEqual({
      hello: 'second(first(ok))',
    });
    await expect(run('@first @second', secondThenFirst)).resolves.toEqual({
      hello: 'first(second(ok))',
    });
  });
});
