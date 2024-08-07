import { parse, print } from 'graphql';
import { normalizedExecutor } from '@graphql-tools/executor';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '../src/stitchSchemas';

describe('Operation Directives', () => {
  it('sends the directives to the subschema operations', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        directive @strExpr on FIELD
        type Query {
          hello: String
        }
      `,
      resolvers: {
        Query: {
          hello: (_source, _args, _context, info) => {
            return print(info.operation);
          },
        },
      },
    });

    const gateway = stitchSchemas({
      subschemas: [schema],
      mergeDirectives: true,
    });

    const res = await normalizedExecutor({
      schema: gateway,
      document: parse(/* GraphQL */ `
        query getHello {
          hello @strExpr
        }
      `),
    });

    expect(res).toEqual({
      data: {
        hello: /* GraphQL */ `
query getHello {
  __typename
  hello @strExpr
}`.trim(),
      },
    });
  });
});
