---
id: stitch-combining-schemas
title: Combining multiple schemas
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
      chirpsByAuthorId(authorId: ID!): [Chirp]!
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

Subschema config should be provided as many settings as possible (directly) to avoid unnecessary layers of delegation. For example, while you _could_ use `wrapSchema` to pre-bundle a schema with transforms and an executor, that would be far less efficient than providing the `schema`, `transforms`, and `executor` options directly to subschema config.

Also note that your original subschema config objects will need to be referenced while setting up more advanced stitching features. With that in mind, you'll probably want to export your subschema configs from their module(s) so they may be referenced throughout your app.


<!-- Note the new `subschemas` property with an array of subschema configuration objects. This syntax is a bit more verbose, but we shall see how it provides multiple benefits:
1. transforms should be specified on the subschema config object, avoiding creation of a new schema with a new round of delegation in order to transform a schema prior to merging. This also makes it simple to include the necessary transforms when delegating, as you will pass the entire subschema configuration object to `delegateToSchema` instead of just the schema, with the required transforms included for free.
2. remote subschema configuration options can be specified, also avoiding an additional round of schema proxying. That's three rounds of delegations reduce to one! -->

## Stitching remote schemas

To include a remote schema, we'll need to provide subschema config settings for&mdash;at minimum&mdash;a _non-executable_ schema and an executor that connects to the remote API:

```js
import { buildSchema } from 'graphql';
import { linkToExecutor } from '@graphql-tools/links';

export const chirpSubschema = {
  schema: buildSchema(chirpTypeDefs),
  executor: linkToExecutor(chirpServiceLink),
};
```

The remote schema's definition string may be obtained via introspection (see `introspectSchema`) or through your own internal protocol.

An executor is a generic method of connecting to a schema. You may write your own, or use the `linkToExecutor` helper to wrap a link package such as [apollo-link-http](https://www.apollographql.com/docs/link/links/http/). Subschema config accepts an `executor` option for query and mutation operations, and a `subscriber` function for subscription operations. See the [remote schema](/docs/remote-schemas/) docs for more information.

_**For pre-version 5:** the old method of using [makeRemoteExecutableSchema](/docs/remote-schemas/) to create a local proxy of the remote schema still works. However, it adds an additional layer of delegation that can be avoided by sending settings directly to `stitchSchemas` via SubschemaConfig._

## Duplicate definitions

By default, schema stitching will override type definitions that are duplicated across subschemas&mdash;always favoring the final definition of fields, arguments, and docstrings for an object type across the array of stitched subschemas. This works fine for subschemas that implement identical versions of an object type. As of GraphQL Tools version 5, you may now enable [type merging](/docs/stitch-merging-types) to smartly merge divergent type definitions from across subschemas.

## Adding Transforms

Another strategy to avoid conflicts while combining existing schemas is to modify one or more of the schemas using [transforms](/docs/schema-wrapping). This process will allow us to groom a schema (probably one we don't own) in such ways as adding namespaces, renaming types, or removing fields prior to stitching it into our API. As of GraphQL Tools version 5, we can add these transforms directly to subschema config rather than delegating to a wrapped schema with transforms:

```js
import { FilterRootFields, RenameTypes } from '@graphql-tools/wrap';

export const chirpSubschema = {
  schema: chirpSchema,
  transforms: [
    new FilterRootFields((operation: string, rootField: string) => rootField !== 'chirpsByAuthorId'),
    new RenameTypes((name: string) => `Chirp_${name}`),
  ],
};
```

In the example above, we transform the `chirpSchema` by removing the `chirpsByAuthorId` root field and adding a `Chirp_` prefix to all types.
