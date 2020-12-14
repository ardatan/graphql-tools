---
id: stitch-type-merging
title: Type merging
sidebar_label: Type merging
---

Type merging allows _partial definitions_ of a type to exist in any subschema, all of which are merged into one unified type in the gateway schema. When querying for a merged type, the gateway smartly delegates portions of a request to each relevant subschema in dependency order, and then combines all results for the final return.

Type merging is now the preferred method of including GraphQL types across subschemas, replacing the need for [schema extensions](/docs/stitch-schema-extensions) (though does not preclude their use). To migrate from schema extensions, simply enable type merging and then start replacing extensions one by one with merges.

<div class="video-player"><iframe src="https://www.youtube.com/embed/KBACiSA5sEQ?list=PLTJ2vmU3jbWy6JntdRQZAmy0mcpYu2OD1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>

## Basic example

Type merging allows each subschema to provide subsets of a type that it has data for. For example:

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
      postUserById(id: ID!): User
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

Note that both services define a _different_ `User` type. While the users service manages information about user accounts, the posts service simply provides posts associated with a user ID. Now we just have to configure the `User` type to be merged. Type merging requires a query from each subschema to provide its version of a merged type:

```js
import { stitchSchemas } from '@graphql-tools/stitch';

const gatewaySchema = stitchSchemas({
  subschemas: [
    {
      schema: postsSchema,
      merge: {
        User: {
          fieldName: 'postUserById',
          selectionSet: '{ id }',
          args: (originalObject) => ({ id: originalObject.id }),
        }
      }
    },
    {
      schema: usersSchema,
      merge: {
        User: {
          fieldName: 'userById',
          selectionSet: '{ id }',
          args: (originalObject) => ({ id: originalObject.id }),
        }
      }
    },
  ],
  mergeTypes: true // << optional in v7
});
```

That's it! Under the subschema config `merge` option, each merged type provides a query for accessing its respective partial type (services without an expression of the type may omit this). The query settings are:

- `fieldName` specifies a root field used to request the local type.
- `selectionSet` specifies one or more key fields required from other services to perform this query. Query planning will automatically resolve these fields from other subschemas in dependency order.
-  `args` formats the initial object representation into query arguments.

See related [handbook example](https://github.com/gmac/schema-stitching-handbook/tree/master/type-merging-single-records) for a working demonstration of this setup. This JavaScript-based syntax may also be written directly into schema type definitions using the [stitching directives SDL](/docs/stitch-directives-sdl):

```graphql
type User @key(selectionSet: "{ id }") {
  id: ID!
  email: String!
}

type Query {
  userById(id: ID!): User @merge(keyField: "id")
}
```

Regardless of how this merge configuration is written, it allows type merging to smartly resolve a complete `User`, regardless of which service provides the initial representation of it. We now have a combined `User` type in the gateway schema:

```graphql
type User {
  id: ID!
  email: String!
  posts: [Post]!
}
```

### Types without a database

It's logical to assume that each `postUserById` query has a backing database table used to lookup the requested user ID. However, this is frequently not the case. Here's a simple example that demonstrates how `User.posts` can be resolved without the posts service having any formal database concept of a User:

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
      postUserById(id: ID!): User
    }
  `,
  resolvers: {
    Query: {
      postById: (root, { id }) => postsData.find(post => post.id === id),
      postUserById: (root, { id }) => ({ id }),
    },
    User: {
      posts(user) {
        return postsData.filter(post => post.authorId === user.id);
      }
    }
  }
});
```

In this example, the `postUserById` resolver simply converts a submitted user ID into stub record that gets resolved as the local `User` type.

### Null records

The above example will always resolve a stubbed `User` record for _any_ requested ID. For example, requesting ID `7` (which has no associated posts) would return:

```js
{ id: '7', posts: [] }
```

This fabricated record fulfills the not-null requirement of the `posts:[Post]!` field. However, it also makes the posts service awkwardly responsible for data it knows only by omission. A cleaner solution may be to loosen schema nullability down to `posts:[Post]`, and then return `null` for unknown user IDs without associated posts. Null is a valid mergable object as long as the unique fields it fulfills are nullable.

## Merging flow

To better understand the flow of merged object calls, let's break down the [basic example](#basic-example) above:

![Schema Stitching flow](../static/img/stitching-flow.png)

1. A request is submitted to the gateway schema that selects fields from multiple subschemas.
2. The gateway fetches the resource that was **explicitly** requested (`userById`), known as the _original object_. This subquery is filtered to match its subschema, and adds the `selectionSet` of other subschemas that must **implicitly** provide data for the request.
3. The original object returns with fields requested by the user and those necessary to query other subschemas, per their `selectionSet`.
4. Merge config builds subsequent queries for _merger objects_ that will provide missing data. These subqueries are built using `fieldName` with arguments derived from the original object.
5. Subqueries for merger objects are initiated; again filtering each query to match its intended subschema, and adding the `selectionSet` of other subschemas&dagger;. Merger queries run in parallel when possible.
6. Merger objects are returned with additional fields requested by the user and those necessary to query other subschemas, per their `selectionSet`&dagger;.
7. Merger objects are applied to the original object, building an aggregate result.
8. The gateway responds with the original query selection applied to the aggregate merge result.

_&dagger; Note: merger subqueries may still collect unique `selectionSet` fields. Given subschemas A, B, and C, it's perfectly valid for schema C to specify fields from both A and B in its selection set. When this happens, resolving C will simply be deferred until the merger of A and B can be provided as its original object._

## Batching

The [basic example](#basic-example) above queries for a single record each time it performs a merge, which is suboptimal when merging arrays of objects. Instead, we should batch many record requests together using array queries that may fetch many partials at once, the schema for which would be:

```graphql
postUsersByIds(ids: [ID!]!): [User]!
usersByIds(ids: [ID!]!): [User]!
```

Once a service provides an array query for a merged type, batching may be enabled by adding a `key` method that picks a key from each partial record. The `argsFromKeys` method then transforms the list of picked keys into query arguments:

```js
const gatewaySchema = stitchSchemas({
  subschemas: [
    {
      schema: postsSchema,
      merge: {
        User: {
          fieldName: 'postUsersByIds',
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
  ]
});
```

A `valuesFromResults` method may also be provided to map the raw query result into the batched set. With this array optimization in place, we'll now only perform one query _per merged field_ (versus per record). However, requesting multiple merged fields will still perform a query each. To optimize this further, we can enable [query batching](https://github.com/gmac/schema-stitching-handbook/wiki/Batching-Arrays-and-Queries#what-is-query-batching):

```js
{
  schema: postsSchema,
  batch: true,
  batchingOptions: { ... },
  merge: {
    User: {
      fieldName: 'postUsersByIds',
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

Using both array batching and query batching together is recommended, and should flatten transactional costs down to one query per subservice per generation of data. See related [handbook example](https://github.com/gmac/schema-stitching-handbook/tree/master/type-merging-arrays) for a working demonstration of this process.

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

When a stub type like the one above includes no unique fields beyond a key shared across services, then the type may be considered _unidirectional_ to the service&mdash;that is, the service holds no unique data that would require an inbound request to fetch it. In these cases, `merge` config may be omitted entirely for the stub type:

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
  ]
});
```

Stubbed types are quick and easy to setup and effectively work as automatic [schema extensions](/docs/stitch-schema-extensions) (in fact, you might not need extensions). A stubbed type may always be expanded with additional service-specific fields (see the [basic example](#basic-example)), however it requires a query in `merge` config as soon as it offers unique data.

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

In the above, both `Post` and `Section` will have a common interface of `{ id title url }` in the gateway schema. The difference in interface fields between the gateway schema and the layouts subschema will be translated automatically during delegation. See related [handbook example](https://github.com/gmac/schema-stitching-handbook/tree/master/type-merging-interfaces) for a working demonstration.

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
  }]
});
```

In the above, the `shippingEstimate` and `deliveryService` fields are marked with `@computed` directives (see [stitching directives SDL](/docs/stitch-directives-sdl)), which specify additional _field-level dependencies_ required to resolve these specific fields beyond the `Product` type's base selection set. When a computed field appears in a query, the gateway will collect that field's dependencies from other subschemas so they may be sent as input with the request for the computed field(s).

The `@computed` SDL directive is a convenience syntax for static configuration that can be written as:

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

The main disadvantage of computed fields is that they cannot be resolved independently from the stitched gateway. Tolerance for this subservice inconsistency is largely dependent on your own service architecture. An imperfect solution is to deprecate all computed fields within a subschema, and then normalize their behavior in the gateway schema using the [`RemoveObjectFieldDeprecations`](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/tests/transformRemoveObjectFieldDeprecations.test.ts) transform.

> **Implementation note:** to facilitate field-level dependencies, computed and non-computed fields of a type in the same subservice are automatically split apart into separate schemas. This assures that computed fields are always requested directly by the gateway with their dependencies provided. However, it also means that computed and non-computed fields may require separate resolution steps. You may enable [query batching](#batching) to consolidate requests whenever possible.

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
- `@requires`: directly comparable to type merging's `@computed` directive. However, merging is decentralized and may resolve computed fields from any number of services.
- `@external`: type merging implicitly expects types in each service to only implement the fields they provide.
- `@provides`: type merging implicitly handles multiple services that implement the same fields, and automatically selects as many requested fields as possible from as few services as possible during each execution cycle.

See related [handbook example](https://github.com/gmac/schema-stitching-handbook/tree/master/type-merging-interfaces) for a demonstration of federation services used in a stitched gateway.

## Type resolvers

Similar to how GraphQL objects implement field resolvers, merging implements type resolvers for fetching and merging partial types. These resolvers are configured automatically, though advanced use cases may want to customize some or all of their default behavior. Merged type resolver methods are of type `MergedTypeResolver`:

```ts
export type MergedTypeResolver = (
  originalObject: any, // initial object being merged onto
  context: Record<string, any>, // gateway request context
  info: GraphQLResolveInfo, // gateway request info
  subschema: SubschemaConfig, // target subschema configuration
  selectionSet: SelectionSetNode, // target subschema selection
  key?: any // the batch key being requested
) => any;
```

### Wrapped resolvers

Frequently we want to augment type resolution without fundamentally changing its behavior. This can be done by building a default resolver function, and then wrapping it in a custom implementation. For example, adding [statsd instrumentation](https://github.com/msiebuhr/node-statsd-client) might look like this:

```js
import { createMergedTypeResolver, stitchSchemas } from '@graphql-tools/stitch';
import { SDC } from 'statsd-client';

const statsd = new SDC({ ... });

function createInstrumentedMergedTypeResolver(resolverOptions) {
  const defaultResolve = createMergedTypeResolver(resolverOptions);
  return async (obj, ctx, info, cfg, sel, key) => {
    const startTime = process.hrtime();
    try {
      return await defaultResolve(obj, ctx, info, cfg, sel, key);
    } finally {
      statsd.timing(info.path.join('.'), process.hrtime(startTime));
    }
  };
}

const schema = stitchSchemas({
  subschemas: [{
    schema: widgetsSchema,
    merge: {
      Widget: {
        selectionSet: '{ id }',
        key: ({ id }) => id,
        resolve: createInstrumentedMergedTypeResolver({
          fieldName: 'widgets',
          argsFromKeys: (ids) => ({ ids }),
        }),
      }
    }
  }]
});
```

The `createMergedTypeResolver` helper accepts a subset of options that would otherwise be included directly on merged type configuration: `fieldName`, `args`, `argsFromKeys`, and `valuesFromResults`. A default MergedTypeResolver function is returned, and may be wrapped with additional behavior and then assigned as a custom `resolve` option for the type.

### Custom resolvers

Alternatively, you may provide completely custom resolver implementations for fetching types in non-standard ways. For example, fetching a merged type from a REST API might look like this:

```js
{
  schema: widgetsSchema,
  merge: {
    Widget: {
      selectionSet: '{ id }',
      resolve: async (originalObject) => {
        const mergeObject = await fetchViaREST(originalObject.id);
        return { ...originalObject, ...mergeObject };
      }
    }
  }
}
```

When incorporating plain objects, always extend the provided `originalObject` to retain internal merge configuration. You may also return direct calls to `delegateToSchema` and `batchDelegateToSchema` (as described for [schema extensions](/docs/stitch-schema-extensions#basic-example)), however&mdash;always provide these delegation methods with a `skipTypeMerging: true` option to prevent infinite recursion.
