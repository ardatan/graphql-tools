---
'@graphql-tools/executor': minor
---

Ability to create critical errors that prevents to return a partial results

```ts
import { CRITICAL_ERROR } from '@graphql-tools/executor';

const schema = makeExecutableSchema({
  typeDefs: `
    type Query {
      hello: String
    }
  `,
  resolvers: {
    Query: {
      hello: () => new GraphQLError('Critical error', {
        extensions: {
          [CRITICAL_ERROR]: true
        }
      })
    }
  }
});
```

This will prevent to return a partial results and will return an error instead.

```ts
const result = await execute({
  schema,
  document: parse(`{ hello }`)
});

expect(result).toEqual({
  errors: [
    {
      message: 'Critical error',
    }
  ],
  data: null, // Instead of { hello: null }
});
```
