---
id: stitch-combining-schemas
title: Combining many schemas into one
sidebar_label: Combining schemas
---

Schema stitching is the process of creating a single GraphQL schema from multiple underlying GraphQL APIs.

One of the main benefits of GraphQL is that we can query all of our data as part of one schema, and get everything we need with a single request. But as the schema grows, it might become cumbersome to manage it all as one codebase. It starts to make sense to split it into seperate modules or microservices that can be developed and deployed independently. We may also want to integrate our own schema with third-party schemas.

In these cases, we use `stitchSchemas` to combine multiple GraphQL schemas together into one new schema that knows how to delegate parts of the query to the relevant underlying subschemas. These subschemas can be local GraphQL instances or APIs running on a remote server. They can even be services offered by third parties, allowing us to create mashups with external data.

## Getting started

In this example we'll stitch together two very simple schemas. We'll be dealing with a system of users and "chirps"&mdash;or, small snippets of text that users can post.

```js
import { makeExecutableSchema } from '@graphql-tools/schema';
import { addMocksToSchema } from '@graphql-tools/mock';
import { stitchSchemas } from '@graphql-tools/stitch';

// Mocked chirp schema
// (we don't need to care about the schema implementation yet)
let chirpSchema = makeExecutableSchema({
  typeDefs: `
    type Chirp {
      id: ID!
      text: String
      authorId: ID!
    }

    type Query {
      chirpById(id: ID!): Chirp
      chirpsByAuthorId(authorId: ID!): [Chirp]
    }
  `
});

chirpSchema = addMocksToSchema({ schema: chirpSchema });

// Mocked author schema
let authorSchema = makeExecutableSchema({
  typeDefs: `
    type User {
      id: ID!
      email: String
    }

    type Query {
      userById(id: ID!): User
    }
  `
});

authorSchema = addMocksToSchema({ schema: authorSchema });

// setup subschema configurations
export const chirpSubschema = { schema: chirpSchema };
export const authorSubschema = { schema: authorSchema };

// build the combined schema
export const schema = stitchSchemas({
  subschemas: [
    chirpSubschema,
    authorSubschema,
  ]
});
```

This process builds two GraphQL schemas, places them each into subschema configuration wrappers, and then passes the subschema configs to `stitchSchems` to produce one combined schema:

```graphql
type Query {
  chirpById(id: ID!): Chirp
  chirpsByAuthorId(authorId: ID!): [Chirp]
  userById(id: ID!): User
}
```

We now have a single schema that supports asking for `userById` and `chirpsByAuthorId` in the same query!

## Subschema Configs

In the example above, the extra subschema wrapper objects may look verbose at first glance, but they are actually a basic implementation of the `SubschemaConfig` interface that we can add several additional settings onto (discussed later in this guide):

```js
export interface SubschemaConfig {
  schema: GraphQLSchema;
  rootValue?: Record<string, any>;
  executor?: Executor;
  subscriber?: Subscriber;
  createProxyingResolver?: CreateProxyingResolverFn;
  transforms?: Array<Transform>;
  merge?: Record<string, MergedTypeConfig>;
}
```

Subschema config should be directly provided as many settings as possible to avoid unnecessary layers of delegation. For example, while you _could_ use `wrapSchema` to pre-bundle a schema with transforms and an executor, that would be far less efficient than providing the `schema`, `transforms`, and `executor` options directly to subschema config.

Also note that your original subschema config objects will need to be referenced while setting up more advanced stitching features. With that in mind, you'll probably want to export your subschema configs from their module(s) so they may be referenced throughout your app.


<!-- Note the new `subschemas` property with an array of subschema configuration objects. This syntax is a bit more verbose, but we shall see how it provides multiple benefits:
1. transforms should be specified on the subschema config object, avoiding creation of a new schema with a new round of delegation in order to transform a schema prior to merging. This also makes it simple to include the necessary transforms when delegating, as you will pass the entire subschema configuration object to `delegateToSchema` instead of just the schema, with the required transforms included for free.
2. remote subschema configuration options can be specified, also avoiding an additional round of schema proxying. That's three rounds of delegations reduce to one! -->

## Stitching in remote schemas

To include a remote schema, we'll need to provide subservice config settings for&mdash;at minimum&mdash;a _non-executable_ schema and an executor that connects to the remote API:

```js
import { buildSchema } from 'graphql';
import { linkToExecutor } from '@graphql-tools/links';

export const chirpSubschema = {
  schema: buildSchema(chirpTypeDefs),
  executor: linkToExecutor(chirpServiceLink),
};
```

The remote schema's definition string may be obtained via introspection (see `introspectSchema`) or through your own internal protocol.

An executor is a generic method of connecting to a schema. You may write your own, or use the `linkToExecutor` helper to wrap a link package such as [apollo-link-http](https://www.apollographql.com/docs/link/links/http/). Subschema config accepts an `executor` option for query and mutation operations, and a `subscriber` function for subscription operations. See the [remote schema](/docs/remote-schemas/) docs for further description of the options available.

_**For pre-version 5:** the old method of using [makeRemoteExecutableSchema](/docs/remote-schemas/) to create a local proxy of the remote schema still works. However, it adds an additional round of delegation that can be avoided by sending settings directly to `stitchSchemas` via Subschema Config._
