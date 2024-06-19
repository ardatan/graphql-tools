---
'@graphql-tools/executor': patch
---

Since the executor is version agnostic, it should respect the schemas created with older versions.

So if a type resolver returns a type instead of type name which is required since `graphql@16`, the executor should handle it correctly.

See the following example:
```ts
// Assume that the following code is executed with `graphql@15`
import { execute } from '@graphql-tools/executor';

const BarType = new GraphQLObjectType({
  name: 'Bar',
  fields: {
    bar: {
      type: GraphQLString,
      resolve: () => 'bar'
    }
  }
});
const BazType = new GraphQLObjectType({
  name: 'Baz',
  fields: {
    baz: {
      type: GraphQLString,
      resolve: () => 'baz'
    }
  }
});
const BarBazType = new GraphQLUnionType({
  name: 'BarBaz',
  types: [BarType, BazType],
  // This is the resolver that returns the type instead of type name
  resolveType(obj) {
    if ('bar' in obj) {
      return BarType;
    }
    if ('baz' in obj) {
      return BazType;
    }
  }
});
const QueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    barBaz: {
      type: BarBazType,
      resolve: () => ({ bar: 'bar' })
    }
  }
});
const schema = new GraphQLSchema({
  query: QueryType
});

const result = await execute({
  schema,
  document: parse(
    /* GraphQL */ `
      query {
        barBaz {
          ... on Bar {
            bar
          }
          ... on Baz {
            baz
          }
        }
      }
    `
  )
});

expect(result).toEqual({
  data: {
    barBaz: {
      bar: 'bar'
    }
  }
});
```
