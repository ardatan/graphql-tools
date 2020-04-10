---
title: Remote schemas
description: Generate GraphQL schema objects that delegate to a remote server
---

It can be valuable to be able to treat remote GraphQL endpoints as if they were local executable schemas. This is especially useful for [schema stitching](/schema-stitching/), but there may be other use cases.

Generally, to create a remote schema, you need three steps:

1. Create a [link](#creating-a-link) that can retrieve results from that schema
2. Use [`introspectSchema`](#introspectschemafetcher-context) to get the schema of the remote server
3. Use [`makeRemoteExecutableSchema`](#makeremoteexecutableschemaoptions) to create a schema that uses the link to delegate requests to the underlying service

We've chosen to split this functionality up to give you the flexibility to choose when to do the introspection step. For example, you might already have the remote schema information, allowing you to skip the `introspectSchema` step entirely. Here's a complete example:

```js
import { HttpLink } from 'apollo-link-http';
import fetch from 'cross-fetch';

const link = new HttpLink({ uri: 'http://example.com/graphql', fetch });

export default async () => {
  const schema = await introspectSchema(link);

  const executableSchema = makeRemoteExecutableSchema({
    schema,
    link,
  });

  return executableSchema
}

```

Now, let's look at all the parts separately.

## Creating a Link

A link is a function capable of retrieving GraphQL results. It is the same way that Apollo Client handles fetching data and is used by several `graphql-tools` features to do introspection or fetch results during execution. Using an Apollo Link brings with it a large feature set for common use cases. For instance, adding error handling to your request is super easy using the `apollo-link-error` package. You can set headers, batch requests, and even configure your app to retry on failed attempts all by including new links into your request chain.

### Link API

Since graphql-tools supports using a link for the network layer, the API is the same as you would write on the client. To learn more about how Apollo Link works, check out the [docs](https://www.apollographql.com/docs/link/); Both GraphQL and Apollo Links have slightly varying concepts of what `context` is used for. To make it easy to use your GraphQL context to create your Apollo Link context, `makeRemoteExecutableSchema` attaches the context from the graphql resolver onto the link context under `graphqlContext`.

Basic usage

```js
import { HttpLink } from 'apollo-link-http';
import fetch from 'cross-fetch';

const link = new HttpLink({ uri: 'http://example.com/graphql', fetch });

export default async () => {
  const schema = await introspectSchema(link);

  const executableSchema = makeRemoteExecutableSchema({
    schema,
    link,
  });

  return executableSchema
}
```

Authentication headers from context

```js
import { setContext } from 'apollo-link-context';
import { HttpLink } from 'apollo-link-http';
import fetch from 'cross-fetch';

const http = new HttpLink({ uri: 'http://example.com/graphql', fetch });

const link = setContext((request, previousContext) => ({
  headers: {
    'Authorization': `Bearer ${previousContext.graphqlContext.authKey}`,
  }
})).concat(http);


export default async () => {
  const schema = await introspectSchema(link);

  const executableSchema = makeRemoteExecutableSchema({
    schema,
    link,
  });

  return executableSchema
}
```

### Fetcher API

You can also use a fetcher (like cross-fetch) instead of a link. A fetcher is a function that takes one argument, an object that describes an operation:

```js
type Fetcher = (operation: Operation) => Promise<ExecutionResult>;

type Operation {
  query: DocumentNode;
  operationName?: string;
  variables?: Object;
  context?: Object;
}
```

### Using cross-fetch

Basic usage

```js
import fetch from 'cross-fetch';
import { print } from 'graphql';

const fetcher = async ({ query: queryDocument, variables, operationName, context }) => {
  const query = print(queryDocument);
  const fetchResult = await fetch('http://example.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables, operationName })
  });
  return fetchResult.json();
};

export default async () => {
  const schema = makeRemoteExecutableSchema({
    schema: await introspectSchema(fetcher),
    fetcher,
  });
  return schema
}
```

Authentication headers from context

```js
import fetch from 'cross-fetch';
import { print } from 'graphql';

const fetcher = async ({ query: queryDocument, variables, operationName, context }) => {
  const query = print(queryDocument);
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
    schema: await introspectSchema(fetcher),
    fetcher,
  });

  return schema
}
```

## API

### makeRemoteExecutableSchema(options)

`makeRemoteExecutableSchema` takes a single argument: an object of options. The `schema` and either a `fetcher` or a `link` options are required.

```js
import { makeRemoteExecutableSchema } from 'graphql-tools';

const schema = makeRemoteExecutableSchema({
  schema,
  link,
  // fetcher, you can pass a fetcher instead of a link
});
```

Given a GraphQL.js schema (can be a non-executable client schema made by `buildClientSchema`) and a [Link](#link-api) or [Fetcher](#fetcher-api), produce a GraphQL Schema that routes all requests to the link or fetcher.

You can also pass a `createResolver` function to `makeRemoteExecutableSchema` to override how the fetch resolvers are created and executed. The `createResolver` param accepts a `Fetcher` as its first argument and returns a resolver function. This opens up the possibility for users to create batching mechanisms for fetches.
```js
const createResolver: (fetcher: Fetcher) => GraphQLFieldResolver<any, any> = // . . .

const schema = makeRemoteExecutableSchema({
  schema,
  link,
  createResolver
});
```

### introspectSchema(fetcher, [context])

Use `link` to build a client schema using introspection query. This function makes it easier to use `makeRemoteExecutableSchema`. As a result, you get a promise to a non-executable GraphQL.js schema object. Accepts optional second argument `context`, which is passed to the link; see the docs about links above for more details.

```js
import { introspectSchema } from 'graphql-tools';

introspectSchema(link).then((schema) => {
  // use the schema
});

// or, with async/await:
const schema = await introspectSchema(link);
```
