---
title: Error handling and logging
order: 308
description: Add better error logging to your GraphQL schema.
---

GraphQL servers can be tricky to debug. The following functions can help find error faster in many cases.

## API

<h3 id="addErrorLoggingToSchema" title="addErrorLoggingToSchema">
  addErrorLoggingToSchema(schema, logger)
</h3>

This function may be deprecated in the near future. Instead of using addErrorLoggingToSchema, the `formatError` option of `apolloServer` or `graphqlHTTP` should be used, which was recently added in graphql-js v0.5.0

`addErrorLoggingToSchema` takes two arguments: `schema` and `logger`. `schema` must be an instance of `GraphQLSchema`, `logger` must be an Object with a callable property `log`. Every time an error occurs, `logger.log(e)` will be called.
```js
import { addErrorLoggingToSchema } from 'graphql-tools';
const logger = { log: (e) => console.error(e.stack) };
addErrorLoggingToSchema(mySchema, logger);
```

