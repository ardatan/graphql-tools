---
id: stitch-type-merging
title: Type merging
sidebar_label: Type merging
---

Type merging allows _partial definitions_ of a type to exist in any subschema, all of which are merged into one unified type in the gateway schema. When querying for a merged type, the gateway smartly delegates portions of a request to each relevant subschema in dependency order, and then combines all results for the final return.

Type merging is now the preferred method of including GraphQL types across subschemas, replacing the need for [schema extensions](/docs/stitch-schema-extensions) (though does not preclude their use). To migrate from schema extensions, simply enable type merging and then start replacing extensions one by one with merges.

## Basic example

Type merging allows each subschema to provide portions of a type that it posesses data for. For example:

```js
import { makeExecutableSchema } from '@graphql-tools/schema';
import { addMocksToSchema } from '@graphql-tools/mock';

let postsSchema = makeExecutableSchema({
  typeDefs: `
    type Post {
      id: ID!
      message: String!
      author: User!
    }

    type User {
      id: ID!
      posts: [Post]!
    }

    type Query {
      postById(id: ID!): Post
      userById(id: ID!): User
    }
  `
});

let usersSchema = makeExecutableSchema({
  typeDefs: `
    type User {
      id: ID!
      email: String!
    }

    type Query {
      userById(id: ID!): User
    }
  `
});

// just mock the schemas for now to make them return dummy data
postsSchema = addMocksToSchema({ schema: postsSchema });
usersSchema = addMocksToSchema({ schema: usersSchema });
```

Note that both services define a _different_ `User` type. While the users service manages information about user accounts, the posts service simply provides posts associated with a user ID. Now we just have to configure the `User` type to be merged. Type merging needs a query in each schema to provide its version of a merged type:

```js
import { stitchSchemas } from '@graphql-tools/stitch';

const gatewaySchema = stitchSchemas({
  subschemas: [
    {
      schema: postsSchema,
      merge: {
        User: {
          fieldName: 'userById',
          selectionSet: '{ id }',
          args: (partialUser) => ({ id: partialUser.id }),
        }
      }
    },
    {
      schema: usersSchema,
      merge: {
        User: {
          fieldName: 'userById',
          selectionSet: '{ id }',
          args: (partialUser) => ({ id: partialUser.id }),
        }
      }
    },
  ],
  mergeTypes: true
});
```

That's it! Under the subschema config `merge` option, each merged type provides a query for accessing its respective partial type (services without an expression of the type may omit this). The query settings are:

- `fieldName` specifies a root query used to request the local type.
- `selectionSet` specifies one or more key fields required from other services to perform the query. Query planning will automatically resolve these fields from other schemas in dependency order.
-  `args` formats the returned selection set data into query arguments.

This configuration allows type merging to smartly resolve a complete `User`, regardless of which service provides the initial representation of it. We now have a combined `User` type in the gateway schema:

```graphql
type User {
  id: ID!
  email: String!
  posts: [Post]!
}
```

Note that [subschema transforms](/docs/stitch-combining-schemas#adding-transforms) are applied prior to merging. That means transformed types will merge based on their _transformed_ names within the combined gateway schema.

### Types without a database

It's logical to assume that each `userById` query has a backing database table used to lookup the requested user ID. However, this is frequently not the case! Here's a simple example that demonstrates how `User.posts` can be resolved without the posts service having any formal database concept of a User:

```js
const postsData = [
  { id: '1', message: 'Hello', authorId: '7' },
  { id: '2', message: 'Goodbye', authorId: '5' },
];

const postsSchema = makeExecutableSchema({
  typeDefs: `
    type Post {
      id: ID!
      message: String!
      author: User!
    }

    type User {
      id: ID!
      posts: [Post]!
    }

    type Query {
      postById(id: ID!): Post
      userById(id: ID!): User
    }
  `,
  resolvers: {
    Query: {
      postById: (root, { id }) => postsData.find(post => post.id === id),
      userById: (root, { id }) => ({ id }),
    },
    User: {
      posts(user) {
        return postsData.filter(post => post.authorId === user.id);
      }
    }
  }
});
```

In this example, `userById` simply converts the submitted ID into stub record that gets resolved as the local `User` type.

## Batching

The basic example above queries for a single record each time it performs a merge, which becomes suboptimal when merging arrays of objects. Instead, we should batch many record requests together using array queries that may fetch many partials at once:

```graphql
usersByIds(ids: [ID!]!): [User]!
```

Once each service provides an array query for the merged type, batching may be enabled by adding a `key` method that picks a key from each partial record. The `argsFromKeys` method then transforms the list of picked keys into query arguments:

```js
const gatewaySchema = stitchSchemas({
  subschemas: [
    {
      schema: postsSchema,
      merge: {
        User: {
          fieldName: 'usersByIds',
          selectionSet: '{ id }',
          key: ({ id }) => id,
          argsFromKeys: (ids) => ({ ids }),
        }
      }
    },
    {
      schema: usersSchema,
      merge: {
        User: {
          fieldName: 'usersByIds',
          selectionSet: '{ id }',
          key: ({ id }) => id,
          argsFromKeys: (ids) => ({ ids }),
        }
      }
    },
  ],
  mergeTypes: true
});
```

A `valuesFromResults` method may also be provided to map the raw query result into the batched set. With this array optimization in place, we'll now only perform one query per merged field. However, multiple merged fields will still perform a query each. To optimize this further, we can now enable [query-level batching](https://github.com/prisma-labs/http-link-dataloader#even-better-batching) (as of GraphQL Tools v6.2):

```js
{
  schema: postsSchema,
  batch: true,
  batchingOptions: { ... },
  merge: {
    User: {
      fieldName: 'usersByIds',
      selectionSet: '{ id }',
      key: ({ id }) => id,
      argsFromKeys: (ids) => ({ ids }),
    }
  }
}
```

Query batching will collect all queries made during an execution cycle and combine them into a single GraphQL operation to send to the subschema. This consolidates networking with remote services, and improves database batching within the underlying service implementation. You may customize query batching behavior with `batchingOptions`&mdash;this is particularly useful for providing [DataLoader options](https://github.com/graphql/dataloader#new-dataloaderbatchloadfn--options):

```ts
batchingOptions?: {
  dataLoaderOptions?: DataLoader.Options<K, V, C>;
  extensionsReducer?: (mergedExtensions: Record<string, any>, executionParams: ExecutionParams) => Record<string, any>;
}
```

Using both array batching and query batching together is recommended for best performance.

## Unidirectional merges

Type merging allows services to provide the bare minimum of fields they possess data for&mdash;and this is frequently nothing but an ID. For example:

```js
let postsSchema = makeExecutableSchema({
  typeDefs: `
    type Post {
      id: ID!
      message: String!
      author: User!
    }

    # ID-only stub...
    type User {
      id: ID!
    }

    type Query {
      postById(id: ID!): Post
    }
  `
});

let usersSchema = makeExecutableSchema({
  typeDefs: `
    type User {
      id: ID!
      email: String!
    }

    type Query {
      usersByIds(ids: [ID!]!): [User]!
    }
  `
});
```

When a stub type like the one above includes no other data beyond a key shared across services, then the type may be considered _unidirectional_ to the service&mdash;that is, the service holds no unique data that would require an inbound request to fetch it. In these cases, `merge` config may be omitted entirely for the stub type:

```js
const gatewaySchema = stitchSchemas({
  subschemas: [
    {
      schema: postsSchema,
    },
    {
      schema: usersSchema,
      merge: {
        User: {
          selectionSet: '{ id }',
          fieldName: 'usersByIds',
          key: ({ id }) => id,
          argsFromKeys: (ids) => ({ ids }),
        }
      }
    },
  ],
  mergeTypes: true
});
```

Stubbed types are quick and easy to setup and effectively work as automatic [schema extensions](/docs/stitch-schema-extensions) (in fact, you might not need extensions!). A stubbed type may always be expanded with additional service-specific fields (see the [basic example](#basic-example)), however it requires a query in `merge` config as soon as it offers unique data.

## Merged interfaces

Type merging will automatically consolidate interfaces of the same name across subschemas, allowing each subschema to contribute fields. This is extremely useful when the complete interface of fields is not available in all subschemas&mdash;each subschema simply provides the minimum set of fields that it contains:

```js
const postsSchema = makeExecutableSchema({
  typeDefs: `
    interface HomepageSlot {
      id: ID!
      title: String!
      url: URL!
    }

    type Post implements HomepageSlot {
      id: ID!
      title: String!
      url: URL!
    }
  `
});

const layoutsSchema = makeExecutableSchema({
  typeDefs: `
    interface HomepageSlot {
      id: ID!
    }

    type Post implements HomepageSlot {
      id: ID!
    }

    type Section implements HomepageSlot {
      id: ID!
      title: String!
      url: URL!
      posts: [Post!]!
    }

    type Homepage {
      slots: [HomepageSlot]!
    }
  `
});
```

In the above, both `Post` and `Section` will have a common interface of `{ id title url }` in the gateway schema. The difference in fields between the gateway schema and the layouts subschema will be translated automatically.

## Merged descriptions

The default description (docstring) of each merged type and field comes from the final definition encountered in the subschemas array. You may customize this by adding selection logic into `typeMergingOptions`. For example, these handlers will select the first non-blank description for each type and field:

```js
const gatewaySchema = stitchSchemas({
  subschemas: [...],
  mergeTypes: true,
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

## Computed fields

APIs may leverage the gateway layer to transport field dependencies from one subservice to another while resolving data. This is useful when a field in one subschema requires one or more fields from other subschemas to be resolved, as described in the [federation spec](https://www.apollographql.com/docs/apollo-server/federation/federation-spec/#requires). For example:

```js
const productsSchema = makeExecutableSchema({
  typeDefs: `
    type Product {
      id: ID!
      price: Float!
      weight: Int!
    }

    type Query {
      productsByIds(ids: [ID!]!): [Product]!
    }
  `,
  resolvers: { ... },
});

const storefrontsSchema = makeExecutableSchema({
  typeDefs: `
    directive @computed(selectionSet: String!) on FIELD_DEFINITION

    type Storefront {
      id: ID!
      availableProducts: [Product]!
    }

    type Product {
      id: ID!
      shippingEstimate: Float! @computed(selectionSet: "{ price weight }")
      deliveryService: String! @computed(selectionSet: "{ weight }")
    }

    input ProductInput {
      id: ID!
      price: Float
      weight: Int
    }

    type Query {
      storefront(id: ID!): Storefront
      _products(representations: [ProductInput!]!): [Product]!
    }
  `,
  resolvers: {
    Query: {
      storefront: (root, { id }) => ({ id, availableProducts: [{ id: '23' }] }),
      _products: (root, { representations }) => representations,
    },
    Product: {
      shippingEstimate: (rep) => rep.price > 50 ? 0 : rep.weight / 2,
      deliveryService: (rep) => rep.weight > 50 ? 'FREIGHT' : 'POSTAL',
    }
  }
});

const gatewaySchema = stitchSchemas({
  subschemas: [{
    schema: productsSchema,
    merge: {
      Product: {
        selectionSet: '{ id }',
        fieldName: 'productsByIds',
        key: ({ id }) => id,
        args: (ids) => ({ ids }),
      }
    }
  }, {
    schema: storefrontsSchema,
    merge: {
      Product: {
        selectionSet: '{ id }',
        fieldName: '_products',
        key: ({ id, price, weight }) => ({ id, price, weight }),
        argsFromKeys: (representations) => ({ representations }),
      }
    }
  }],
  mergeTypes: true,
});
```

In the above, the `shippingEstimate` and `deliveryService` fields are marked with `@computed` directives, which specify additional _field-level dependencies_ required to resolve these specific fields beyond the `Product` type's base selection set. When a computed field appears in a query, the gateway will collect that field's dependencies from other subschemas so they may be sent as input with the request for the computed field(s).

To facilitate this dependency pattern, computed and non-computed fields of a type in the same subservice are automatically split apart into separate schemas. This assures that computed fields are always requested directly by the gateway with their dependencies provided. For example, `Storefront.availableProducts` may originate Product records within the storefronts service, but these records may not immedaitely compute `shippingEstimate` because they do not yet have their external dependencies. Instead, the gateway will need to return to the storefronts service with a dedicated request for computed fields that includes their dependencies as input. All told, types that combine computed and non-computed fields in a single subschema may require an extra resolution step by the gateway. You may enable [query batching](#batching) to consolidate these requests whenever possible.

The `@computed` SDL directive is a convenience syntax for static configuration that can be written as follows:

```js
{
  schema: storefrontsSchema,
  merge: {
    Product: {
      selectionSet: '{ id }',
      computedFields: {
        shippingEstimate: { selectionSet: '{ price weight }' },
        deliveryService: { selectionSet: '{ weight }' },
      },
      fieldName: '_products',
      key: ({ id, price, weight }) => ({ id, price, weight }),
      argsFromKeys: (representations) => ({ representations }),
    }
  }
}
```

The main disadvantage of computed fields is that they create fields within a subservice that cannot be resolved without the gateway. Tolerance for this inconsistency is largely dependent on your own service architecture. An imperfect solution is to deprecate all computed fields within a subschema, and then normalize their behavior in the gateway schema using the [`RemoveObjectFieldDeprecations`](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/tests/transformRemoveObjectFieldDeprecations.test.ts) transform.

## Federation services

If you're familiar with [Apollo Federation](https://www.apollographql.com/docs/apollo-server/federation/introduction/), then you may notice that the above pattern of computed fields looks similar to the `_entities` service design of the [Apollo Federation specification](https://www.apollographql.com/docs/apollo-server/federation/federation-spec/).

While type merging offers [simpler patterns](#unidirectional-merges) with [comparable performance](#batching), it can also interface with Apollo Federation services when needed by sending appropraitely formatted representations to the `_entities` query:

```js
{
  schema: storefrontsSchema,
  merge: {
    Product: {
      selectionSet: '{ id price weight }',
      fieldName: '_entities',
      key: ({ id, price, weight }) => ({ __typename: 'Product', id, price, weight }),
      argsFromKeys: (representations) => ({ representations }),
    }
  }
}
```

Type merging generally maps to Federation concepts as follows:

- `@key`: type merging's closest analog is the type-level `selectionSet` specified in merged type configuration. Unlike Federation though, merging is fully decentralized with no concept of an "origin" service.
- `@requires`: directly comparable to type merging's `@computed` directive. However, merging is decentralized and may resolve required fields from any number of services.
- `@external`: type merging implicitly expects types in each service to only implement the fields they provide.
- `@provides`: type merging implicitly handles multiple services that implement the same fields, and automatically selects as many requested fields as possible from as few services as possible. Available sub-objects within a visited service are automatically selected.


## Custom merge resolvers

The `merge` property of [subschema config](/docs/stitch-combining-schemas#subschema-configs) specifies how types are merged for a service, and provides a map of `MergedTypeConfig` objects:

```ts
export interface MergedTypeConfig {
  selectionSet?: string;
  resolve?: MergedTypeResolver;
  fieldName?: string;
  args?: (originalResult: any) => Record<string, any>;
  key?: (originalResult: any) => K;
  argsFromKeys?: (keys: ReadonlyArray<K>) => Record<string, any>;
  valuesFromResults?: (results: any, keys: ReadonlyArray<K>) => Array<V>;
}
```

All merged types across subschemas will delegate as necessary to other subschemas implementing the same type using the provided `resolve` function of type `MergedTypeResolver`:

```ts
export type MergedTypeResolver = (
  originalResult: any, // initial result from a previous subschema
  context: Record<string, any>, // gateway context
  info: GraphQLResolveInfo, // gateway info
  subschema: GraphQLSchema | SubschemaConfig, // the additional implementing subschema from which to retrieve data
  selectionSet: SelectionSetNode // the additional fields required from that subschema
) => any;
```

The default `resolve` implementation that powers type merging out of the box looks like this:

```js
mergedTypeConfig.resolve = (originalResult, context, info, schemaOrSubschemaConfig, selectionSet) =>
  delegateToSchema({
    schema: schemaOrSubschemaConfig,
    operation: 'query',
    fieldName: mergedTypeConfig.fieldName,
    returnType: getNamedType(info.returnType),
    args: mergedTypeConfig.args(originalResult),
    selectionSet,
    context,
    info,
    skipTypeMerging: true,
  });
```

This resolver switches to a batched implementation in the presence of a `mergedTypeConfig.key` function. You may also provide your own custom implementation, however... note the extremely important `skipTypeMerging` setting. Without this option, your gateway will recursively merge types forever!

Note that when using a custom `resolve` implementation, `fieldName` and `args` are not required. Secondary to an underlying implementation detail, however, `fieldName` must also be included, whenever ary fields are being computed.
