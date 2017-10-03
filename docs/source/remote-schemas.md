---
title: Remote schemas
description: Generate GraphQL schema objects that delegate to a remote server
---

It can be valuable to be able to treat remote GraphQL endpoints as if they were local executable schemas. This is especially useful for [schema stitching](./schema-stitching.html), but there may be other use cases.

<h2 id="creating-fetcher" title="Creating a fetcher">
  Creating a Fetcher
</h2>

A fetcher is a function capable of retrieving GraphQL results. This type of function is used by several `graphql-tools` features to do introspection or fetch results during execution.

<h3 id="fetcher" title="Fetcher API">
  Fetcher API
</h3>

A fetcher is a function that takes one argument, an object that describes an operation:

```js
type Fetcher = (operation: Operation) => Promise<ExecutionResult>;

type Operation {
  query: string;
  operationName?: string;
  variables?: Object;
  context?: Object;
}
```

The `query` field will always be passed, but all of the others are optional. `context` is a special field that can be used to pass in arbitrary options into the fetcher, as in the `introspectSchema` API above.

You can create a fetcher function easily using several popular libraries:

<h3 id="fetcher-apollo-link" title="Using apollo-link">
  Using [apollo-link](https://github.com/apollographql/apollo-link)
</h3>

Basic usage

```js
import { HttpLink, makePromise, execute } from 'apollo-link';

const link = new HttpLink({ uri: 'http://api.githunt.com/graphql' });
const fetcher = (operation) => makePromise(execute(link, operation));

const schema = makeRemoteExecutableSchema({
  schema: await introspectSchema(fetcher),
  fetcher,
});
```

Authentication headers from context

```js
import {
  ApolloLink,
  HttpLink,
  SetContextLink,
  makePromise,
  execute,
} from 'apollo-link';

const link = ApolloLink.from([
  new SetContextLink((context) => ({
    ...context,
    headers: {
      'Authentication': `Bearer ${context.authKey}`,
    },
  }),
  new HttpLink({ uri: 'http://api.githunt.com/graphql' }),
]);

const fetcher = (operation) => makePromise(execute(link, operation));
const schema = makeRemoteExecutableSchema({
  schema: await introspectSchema(fetcher),
  fetcher,
});
```

<h3 id="fetcher-apollo-fetch" title="Using apollo-fetch">
  Using [apollo-fetch](https://github.com/apollographql/apollo-fetch)
</h3>

Basic usage

```js
import { createApolloFetch } from 'apollo-fetch';

const fetcher = createApolloFetch({ uri: 'http://api.githunt.com/graphql'});
const schema = makeRemoteExecutableSchema({
  schema: await introspectSchema(fetcher),
  fetcher,
});
```

Authentication headers from context

```js
const fetcher = createApolloFetch({ uri: 'http://api.githunt.com/graphql'});
fetcher.use({ request, option }, next) => {
  if (!options.headers) {
    options.headers = {};
  }
  options.headers['Authorization'] = `Bearer ${request.context.authKey}`;

  next();
});
const schema = makeRemoteExecutableSchema({
  schema: await introspectSchema(fetcher),
  fetcher,
});
```

<h3 id="fetcher-node-fetch" title="Using node-fetch">
  Using [node-fetch](https://github.com/apollographql/node-fetch)
</h3>

Basic usage

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

Authentication headers from context

```js
import fetch from 'node-fetch';

const fetcher = async ({ query, variables, operationName, context }) => {
  const fetchResult = fetch('http://api.githunt.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authentication': `Bearer ${context.authKey}`,
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

## API

<h3 id="makeRemoteExecutableSchema" title="Making a remote schema">
  makeRemoteExecutableSchema(options)
</h3>

`makeExecutableSchema` takes a single argument: an object of options. Both the `schema` and `fetcher` options are required.

```js
import { makeRemoteExecutableSchema } from 'graphql-tools';

const schema = makeRemoteExecutableSchema({
  schema,
  fetcher,
});
```

Given a GraphQL.js schema (can be a non-executable client schema made by `buildClientSchema`) and a [Fetcher](#fetcher), produce a GraphQL Schema that routes all requests to the fetcher.

<h3 id="introspectSchema" title="introspectSchema">
  introspectSchema(fetcher, [context])
</h3>

Use `fetcher` to build a client schema using introspection query. This function makes it easier to use `makeRemoteExecutableSchema`. As a result, you get a promise to a non-executable GraphQL.js schema object. Accepts optional second argument `context`, which is passed to the fetcher; see the docs about fetchers below for more details.

```js
import { introspectSchema } from 'graphql-tools';

introspectSchema(fetcher).then((schema) => {
  // use the schema
});

// or, with async/await:
const schema = await introspectSchema(fetcher);
```
