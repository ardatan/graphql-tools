---
id: stitch-combining-schemas
title: Combining multiple schemas
sidebar_label: Combining schemas
---

Schema stitching is the process of creating a single GraphQL gateway schema from multiple underlying GraphQL APIs.

One of the main benefits of GraphQL is that we can query for all data in a single request to one schema. As that schema grows though, it may become preferable to break it up into seperate modules or microservices that can be developed independently. We may also want to integrate the schemas we own with third-party schemas, allowing mashups with external data.

In these cases, `stitchSchemas` is used to combine multiple GraphQL schemas into one unified gateway schema that knows how to delegate parts of a query to the relevant underlying subschemas. These subschemas may be local GraphQL instances or APIs running on remote servers.

## Getting started

In this example we'll stitch together two very simple schemas. We'll be dealing with a system of users and posts.

```js
import { makeExecutableSchema } from '@graphql-tools/schema';
import { addMocksToSchema } from '@graphql-tools/mock';
import { stitchSchemas } from '@graphql-tools/stitch';

let postsSchema = makeExecutableSchema({
  typeDefs: `
    type Post {
      id: ID!
      text: String
      authorId: ID!
    }

    type Query {
      postById(id: ID!): Post
      postsByAuthorId(authorId: ID!): [Post]!
    }
  `
});

let usersSchema = makeExecutableSchema({
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
postsSchema = addMocksToSchema({ schema: postsSchema });
usersSchema = addMocksToSchema({ schema: usersSchema });

// setup subschema configurations
export const postsSubschema = { schema: postsSchema };
export const usersSubschema = { schema: usersSchema };

// build the combined schema
export const gatewaySchema = stitchSchemas({
  subschemas: [
    postsSubschema,
    usersSubschema,
  ]
});
```

This process builds two mocked GraphQL schemas, places them each into subschema configuration wrappers (discussed below), and then passes the subschemas to `stitchSchemas` to produce one combined schema with the following root fields:

```graphql
type Query {
  postById(id: ID!): Post
  postsByAuthorId(authorId: ID!): [Post]!
  userById(id: ID!): User
}
```

We now have a single gateway schema that allows data from either subschema to be requested in the same query.

## Subschema configs

In the example above, the extra "subschema" wrapper objects may look verbose at first glance, but they are actually basic implementations of the `SubschemaConfig` interface that accepts several additional settings (discussed throughout this guide):

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

Subschema config should _directly_ provide as many settings as possible to avoid unnecessary layers of delegation. For example, while we _could_ pre-wrap a subschema with transforms and a remote executor, that would be far less efficient than providing the `schema`, `transforms`, and `executor` options directly to subschema config.

Also note that these subschema config objects may need to be referenced again in other stitching contexts, such as [schema extensions](/docs/stitch-schema-extensions). With that in mind, you may want to export your subschema configs from their module(s).

## Stitching remote schemas

To include a remote schema in the combined gateway, we must provide at least the `schema` and `executor` subschema config options:

```js
import { buildSchema } from 'graphql';
import { linkToExecutor } from '@graphql-tools/links';

export const postsSubschema = {
  schema: buildSchema(postsServiceTypeDefs),
  executor: linkToExecutor(postsServiceLink),
};
```

* `schema`: this is a non-executable schema representing the remote API. The remote schema's SDL (schema definition language) may be obtained through a dedicated service such as the [federation service spec](https://www.apollographql.com/docs/federation/federation-spec/#query_service), or using [introspection](/docs/remote-schemas/#introspectschemaexecutor-context). Note that not all GraphQL servers enable introspection, and those that do will not include custom directives.
* `executor`: is a generic method that performs requests to a remote schema. You may [write your own](/docs/remote-schemas#creating-an-executor), or use the `linkToExecutor` helper to wrap a [link package](https://www.npmjs.com/package/apollo-link-http). Subschema config uses the `executor` for query and mutation operations, and accepts a `subscriber` function for subscription operations.

See [remote schemas](/docs/remote-schemas/) documentation for more related tools and information.

## Duplicate types

Stitching has two strategies for types duplicated across subschemas: a merge strategy (default), and an older binary strategy. You may select between these strategies using the `mergeTypes` option.

### Merged types

Duplicate type names are merged by default in GraphQL Tools v7. That means objects, interfaces, and input objects with the same name will have their fields consolidated from across schemas, and unions will consolidate their member types. The combined gateway schema will then smartly delegate portions of a request to the proper origin schema(s). See [type merging](/docs/stitch-type-merging/) for a comprehensive overview.

Type merging only encounters conflicts on type-level descriptions (docstrings) and fields. By default, the final definition of a type description or field found in the subschemas array is used. You may customize this by adding selection logic to `typeMergingOptions`. For example, the following handlers will select the first non-blank description for each type and field encountered in the subschemas array:

```js
const gatewaySchema = stitchSchemas({
  subschemas: [...],
  mergeTypes: true, // << optional in v7
  typeMergingOptions: {
    typeDescriptionsMerger(candidates) {
      const candidate = candidates.find(({ type }) => !!type.description) || candidates.pop();
      return candidate.type.description;
    },
    fieldConfigMerger(candidates) {
      const configs = candidates.map(c => c.fieldConfig);
      return configs.find(({ description }) => !!description) || configs.pop();
    },
    inputFieldConfigMerger(candidates) {
      const configs = candidates.map(c => c.inputFieldConfig);
      return configs.find(({ description }) => !!description) || configs.pop();
    }
  },
});
```

### Binary types

By setting `mergeTypes: false`, only the final set of fields, arguments, and descriptions for a type found in the subschemas array will be used. Conflict resolution may be customized with an `onTypeConflict` handler:

```js
const gatewaySchema = stitchSchemas({
  subschemas: [...],
  mergeTypes: false,
  onTypeConflict: (left, right, info) => {
    return info.left.schema.version >= info.right.schema.version ? left : right;
  }
});
```

Practically speaking, binary resolution requires subschemas to implement identical versions of a type for parity.

## Adding transforms

Another strategy to avoid conflicts while combining schemas is to modify one or more of the schemas using [transforms](/docs/schema-wrapping#transform). Transforming allows a schema to be groomed in such ways as adding namespaces, renaming types, or removing fields (to name a few) prior to stitching it into the combined gateway schema. These transforms should be added directly to subschema config:

```js
import { FilterRootFields, RenameTypes } from '@graphql-tools/wrap';

const postsSubschema = {
  schema: postsSchema,
  transforms: [
    new FilterRootFields((operation, rootField) => rootField !== 'postsByAuthorId'),
    new RenameTypes((name) => `Post_${name}`),
  ],
};
```

In the example above, we transform the `postsSchema` by removing the `postsByAuthorId` root field and adding a `Post_` prefix to all types in the schema. These modifications will only be present in the combined gateway schema.

Note that when [merging types](#merged-types), all transforms are applied _prior_ to merging. That means transformed types will merge based on their transformed names within the combined gateway schema.
