---
title: Remote schemas
order: 309
description: Work with remote GraphQL endpoints
---

Sometimes it's valuable to be able to treat remote GraphQL endpoints as if they were local executable schemas. Use cases include, for example [merging schemas](./schema-merging.html) working with schemas on client.

## API

<h3 id="makeRemoteExecutableSchema" title="makeRemoteExecutableSchema">
  makeRemoteExecutableSchema({ schema: GraphQLSchema, fetcher: Fetcher }): GraphQLSchema
</h3>

Given a GraphQL schema (can be a non-executable client schema made by `buildClientSchema`) and a [Fetcher](#Fetcher), produce a GraphQL Schema that routes all requests to the fetcher.

<h3 id="introspectSchema" title="introspectSchema">
  introspectSchema(fetcher: Fetcher): Promise&lt;GraphQLSchema&gt;</h3>

Use fetcher to build a client schema using introspection query. For easy of use of `makeRemoteExecutableSchema`. Provides a *client* schema, so a non-executable schema.

<h3 id="Fetcher" title="Fetcher">
  Fetcher
</h3>

```js
type Fetcher = (
  operation: {
    query: string;
    operationName?: string;
    variables?: { [key: string]: any };
    context?: { [key: string]: any };
  },
) => Promise<ExecutionResult>;
```

#### Usage with [apollo-link](https://github.com/apollographql/apollo-link)

```js
import { HttpLink, makePromise, execute } from 'apollo-link';

const link = new HttpLink({ uri: 'http://api.githunt.com/graphql' });
const fetcher = (operation) => makePromise(execute(link, operation));
const schema = makeRemoteExecutableSchema({
  schema: await introspectSchema(fetcher),
  fetcher,
});
```

#### Usage with [apollo-fetch](https://github.com/apollographql/apollo-fetch)

```js
import { createApolloFetch } from 'apollo-fetch';

const apolloFetch = createApolloFetch({ uri: 'http://api.githunt.com/graphql'});
const fetcher = ({ query, variables, operationName, context}) => apolloFetch({
  query, variables, operationName
});
const schema = makeRemoteExecutableSchema({
  schema: await introspectSchema(fetcher),
  fetcher,
});
```

#### Usage with a generic HTTP client (like node-fetch)

```js
import fetch from 'node-fetch';

const fetcher = async ({ query, variables, operationName, context }) => {
  const fetchResult = fetch('http://api.githunt.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables, operationName })
  });
  return fetchResult.json();
};
const schema = makeRemoteExecutableSchema({
  schema: await introspectSchema(fetcher),
  fetcher,
});
```
