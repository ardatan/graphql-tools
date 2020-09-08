---
id: stitch-combining-schemas
title: Combining multiple schemas
sidebar_label: Combining schemas
---

Schema stitching is the process of creating a single GraphQL gateway schema from multiple underlying GraphQL APIs.

One of the main benefits of GraphQL is that we can query for all of our data in a single request from one schema. As that schema grows though, it may become cumbersome to manage it all in one codebase. It may become preferable to split the schema into seperate modules or microservices that can be developed and deployed independently. We may also want to integrate our own schema with third-party schemas.

In these cases, `stitchSchemas` is used to combine multiple GraphQL schemas into one unified gateway schema that knows how to delegate parts of a query to the relevant underlying subschemas. These subschemas may be local GraphQL instances or APIs running on a remote server. They can even be third-party services, allowing us to create mashups with external data.

## Getting started

In this example we'll stitch together two very simple schemas. We'll be dealing with a system of users and "chirps"&mdash;or, small snippets of text that users can post.

```js
import { makeExecutableSchema } from '@graphql-tools/schema';
import { addMocksToSchema } from '@graphql-tools/mock';
import { stitchSchemas } from '@graphql-tools/stitch';

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

// just mock the schemas for now to make them return dummy data
chirpSchema = addMocksToSchema({ schema: chirpSchema });
authorSchema = addMocksToSchema({ schema: authorSchema });

// setup subschema configurations
export const chirpSubschema = { schema: chirpSchema };
export const authorSubschema = { schema: authorSchema };

// build the combined schema
export const gatewaySchema = stitchSchemas({
  subschemas: [
    chirpSubschema,
    authorSubschema,
  ]
});
```

This process builds two (mocked) GraphQL schemas, places them each into [subschema configuration](#subschema-configs) wrappers, and then passes the subschema configs to `stitchSchems` to produce one combined schema with the following root fields:

```graphql
type Query {
  chirpById(id: ID!): Chirp
  chirpsByAuthorId(authorId: ID!): [Chirp]!
  userById(id: ID!): User
}
```

We now have a single gateway schema that allows data from either subschema to be requested in the same query!

## Subschema Configs

In the example above, the extra "subschema" wrapper objects may look verbose at first glance, but they are actually basic implementations of the `SubschemaConfig` interface that accept several additional settings (discussed throughout this guide):

```js
export interface SubschemaConfig {
  schema: GraphQLSchema;
  rootValue?: Record<string, any>;
  executor?: Executor;
  subscriber?: Subscriber;
  createProxyingResolver?: CreateProxyingResolverFn;
  transforms?: Array<Transform>;
  merge?: Record<string, MergedTypeConfig>;
  batch?: boolean;
  batchingOptions?: {
    extensionsReducer?: (mergedExtensions: Record<string, any>, executionParams: ExecutionParams) => Record<string, any>;
    dataLoaderOptions?: DataLoader.Options<K, V, C>;
  }
}
```

Subschema config should _directly_ provide as many settings as possible to avoid unnecessary layers of delegation. For example, while `wrapSchema` _could_ be used to pre-wrap a schema with transforms and a remote executor, that would be far less efficient than providing the `schema`, `transforms`, and `executor` options directly to subschema config.

Also note that the original subschema config objects will need to be referenced again in other stitching contexts. With that in mind, you'll probably want to export your subschema configs from their module(s) so they may be referenced throughout your app.

## Stitching remote schemas

To include a remote schema in the combined gateway, we must provide subschema config for&mdash;at minimum&mdash;a schema and an executor that connects to the remote API:

```js
import { buildSchema } from 'graphql';
import { linkToExecutor } from '@graphql-tools/links';

export const chirpSubschema = {
  schema: buildSchema(chirpTypeDefs),
  executor: linkToExecutor(chirpServiceLink),
};
```

The remote schema's type definitions string may be obtained via introspection (see `introspectSchema`) or through your own internal protocol.

An executor is a generic method that performs requests to a remote schema. You may write your own, or use the `linkToExecutor` helper to wrap a link package such as [apollo-link-http](https://www.apollographql.com/docs/link/links/http/). Subschema config accepts an `executor` option for query and mutation operations, and a `subscriber` function for subscription operations. See the [remote schema](/docs/remote-schemas/) docs for more information.

_**For pre-version 5:** the old method of using [makeRemoteExecutableSchema](/docs/remote-schemas/) to create a local proxy of a remote schema still works. However, it adds an additional layer of delegation that can be avoided by sending settings directly to `stitchSchemas` via SubschemaConfig._

## Duplicate type definitions

By default, schema stitching will override type definitions that are duplicated across subschemas&mdash;always favoring the final definition of fields, arguments, and descriptions for a type found in the `subschemas` array. This works fine when subschemas implement identical versions of an object type. For divergent type definitions, you may now enable [type merging](/docs/stitch-type-merging) (as of GraphQL Tools 5) to smartly merge partial type definitions from across subschemas.

## Adding transforms

Another strategy to avoid conflicts while combining schemas is to modify one or more of the schemas using [transforms](/docs/schema-wrapping). Transforming allows a schema to be groomed in such ways as adding namespaces, renaming types, or removing fields (to name a few) prior to stitching it into the combined gateway schema. As of GraphQL Tools version 5, these transforms should be added directly to subschema config:

```js
import { FilterRootFields, RenameTypes } from '@graphql-tools/wrap';

const chirpSubschema = {
  schema: chirpSchema,
  transforms: [
    new FilterRootFields((operation, rootField) => rootField !== 'chirpsByAuthorId'),
    new RenameTypes((name) => `Chirp_${name}`),
  ],
};
```

In the example above, we transform the `chirpSchema` by removing the `chirpsByAuthorId` root field and adding a `Chirp_` prefix to all types. These modifications will only be present in the combined gateway schema.
