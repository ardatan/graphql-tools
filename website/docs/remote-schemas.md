---
id: remote-schemas
title: Remote schemas
description: Generate GraphQL schema objects that delegate to a remote server
---

It can be valuable to be able to treat remote GraphQL endpoints as if they were local executable schemas. This is especially useful for [schema stitching](/docs/schema-stitching/), but there may be other use cases.

Generally, to create a remote schema, you need three steps:

1. Create a [executor](#creating-a-executor) that can retrieve results from that schema
2. Use [`introspectSchema`](#introspectschemaexecutor-context) to get the schema of the remote server
3. Use [`makeRemoteExecutableSchema`](#makeremoteexecutableschemaoptions) to create a schema that uses the executor to delegate requests to the underlying service
4. Create a [subscriber][#creating-a-subscriber] that can retrieve real time results from that schema (Optional only if you are using GraphQL Subscriptions)

### Creating an executor

You can use an executor with an HTTP Client implementation (like cross-fetch). An executor is a function capable of retrieving GraphQL results. It is the same way that a GraphQL Client handles fetching data and is used by several `graphql-tools` features to do introspection or fetch results during execution.

We've chosen to split this functionality up to give you the flexibility to choose when to do the introspection step. For example, you might already have the remote schema information, allowing you to skip the `introspectSchema` step entirely. Here's a complete example:

```js
type Executor = (operation: Operation) => Promise<ExecutionResult>;

type Operation {
  document: DocumentNode;
  variables?: Object;
  context?: Object;
  info?: GraphQLResolveInfo
}
```

### Using cross-fetch

Basic usage

```js
import { fetch } from 'cross-fetch';
import { print } from 'graphql';

const executor = async ({ document, variables }) => {
  const query = print(document);
  const fetchResult = await fetch('http://example.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables })
  });
  return fetchResult.json();
};

export default async () => {
  const schema = makeRemoteExecutableSchema({
    schema: await introspectSchema(executor),
    executor,
  });
  return schema
}
```

Authentication headers from context

```js
import { fetch } from 'cross-fetch';
import { print } from 'graphql';

const executor = async ({ document, variables, context }) => {
  const query = print(document);
  const fetchResult = await fetch('http://example.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${context.authKey}`,
    },
    body: JSON.stringify({ query, variables, operationName })
  });
  return fetchResult.json();
};

export default async () => {
  const schema = makeRemoteExecutableSchema({
    schema: await introspectSchema(executor),
    executor,
  });

  return schema
}
```

## API

### makeRemoteExecutableSchema(options)

`makeRemoteExecutableSchema` takes a single argument: an object of options. The `schema` and a `executor` options are required.

```js
import { makeRemoteExecutableSchema } from 'graphql-tools';

const schema = makeRemoteExecutableSchema({
  schema,
  executor,
});
```

Given a GraphQL.js schema (can be a non-executable client schema made by `buildClientSchema`) and a [executor](#creating-an-executor), produce a GraphQL Schema that routes all requests to the executor.

You can also pass a `createResolver` function to `makeRemoteExecutableSchema` to override how the fetch resolvers are created and executed. The `createResolver` param accepts an `Executor` as its first argument and returns a resolver function. This opens up the possibility for users to create batching mechanisms for fetches.
```js
const createResolver: (executor: Executor) => GraphQLFieldResolver<any, any> = // . . .

const schema = makeRemoteExecutableSchema({
  schema,
  executor,
  createResolver
});
```

### introspectSchema(executor, [context])

Use `executor` to build a client schema using introspection query. This function makes it easier to use `makeRemoteExecutableSchema`. As a result, you get a promise to a non-executable GraphQL.js schema object. Accepts optional second argument `context`, which is passed to the executor; see the docs about executors above for more details.

```js
import { introspectSchema } from 'graphql-tools';

introspectSchema(executor).then((schema) => {
  // use the schema
});

// or, with async/await:
const schema = await introspectSchema(executor);
```

## Creating a subscriber
> TODO
