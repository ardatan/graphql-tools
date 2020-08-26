import { execute, parse } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { wrapSchema } from '../src/wrapSchema';

const typeDefs = /* GraphQL */`
  type Query {
    boo: String!
  }
`

const resolvers = {
  Query: {
    boo() {
      return 'boo';
    },
  },
};

test('should run executor once on a single root field', async () => {
  const query = parse(/* GraphQL */`
    {
      boo
    }
  `);

  const executor = jest.fn();
  const innerSchema = makeExecutableSchema({
    resolvers,
    typeDefs,
  });
  const schema = wrapSchema({
    schema: innerSchema,
    executor({ document, context, variables }) {
      executor();
      return execute({
        schema: innerSchema,
        document,
        contextValue: context,
        variableValues: variables
      }) as any;
    }
  })

  await execute({
    schema,
    document: query,
  });

  expect(executor).toBeCalledTimes(1);
});

test('should run executor once on multiple root fields', async () => {
  const query = parse(/* GraphQL */`
  {
    foo: boo
    bar: boo
  }
`);

  const executor = jest.fn();
  const innerSchema = makeExecutableSchema({
    resolvers,
    typeDefs,
  });
  const schema = wrapSchema({
    schema: innerSchema,
    executor({ document, context, variables }) {
      executor();
      return execute({
        schema: innerSchema,
        document,
        contextValue: context,
        variableValues: variables
      }) as any;
    }
  })

  await execute({
    schema,
    document: query,
  });

  expect(executor).toBeCalledTimes(1);
});
