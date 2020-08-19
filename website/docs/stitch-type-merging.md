---
id: stitch-type-merging
title: Type merging
sidebar_label: Type merging
---

Type merging offers an alternative strategy to [schema extensions](/docs/stitch-schema-extensions) for including types across subschemas. It allows _partial definitions_ of a type to exist in any subschema, and then merges all partials into one unified type in the gateway schema. When querying for a merged type, the gateway smartly delegates portions of the request to each relevant subschema in dependency order, and then combines all results for the final return.

Using type merging frequently eliminates the need for schema extensions, though does not preclude their use. Merging can often outperform extensions by resolving entire portions of an object tree with a single delegation. More broadly, it offers similar capabilities to [Apollo Federation](https://www.apollographql.com/docs/apollo-server/federation/introduction/) while using only plain GraphQL and bare-metal configuration.

## Basic example

Type merging encourages types to be split naturally across services by concern. For example, let's make a small classifieds app where users may list items for sale that other users can purchase. Separating listings from users might look like this:

```js
import { makeExecutableSchema } from '@graphql-tools/schema';
import { addMocksToSchema } from '@graphql-tools/mock';

let listingsSchema = makeExecutableSchema({
  typeDefs: `
    type Listing {
      id: ID!
      description: String!
      price: Float!
      seller: User!
      buyer: User
    }

    type User {
      id: ID!
      listings: [Listing]!
    }

    type Query {
      listingById(id: ID!): Listing
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
listingsSchema = addMocksToSchema({ schema: listingsSchema });
usersSchema = addMocksToSchema({ schema: usersSchema });
```

Note that both services define a _different_ `User` type. While the users service manages information about user accounts, the listings service simply provides listings associated with a user ID. Now we just have to configure the `User` type to be merged:

```js
import { stitchSchemas } from '@graphql-tools/stitch';

const gatewaySchema = stitchSchemas({
  subschemas: [
    {
      schema: listingsSchema,
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

That's it! Under the [subschema config](/docs/stitch-combining-schemas#subschema-configs) `merge` option, each subschema simply provides a query for accessing its respective partial type (services without an expression of the type may omit this). The merge config's `fieldName` specifies a query, `selectionSet` specifies one or more key fields required from other services to perform the query, and `args` formats the preceding partial data into query arguments. This configuration allows type merging to smartly resolve a complete `User`, regardless of which service provides the initial representation of it.

We now have a combined `User` type in the gateway schema!

```graphql
type User {
  id: ID!
  email: String!
  listings: [Listing]!
}
```

### With batching

An inefficiency in the example above is that subschemas are queried for only one `User` partial at a time via `userById`. These single queries quickly add up, especially when resolving arrays of objects. We can fix this with batching. The first thing we'll need are array queries that fetch many partials at once from each service:

```graphql
usersByIds(ids: [ID!]!): [User]!
```

Once each service provides an array query, batching may be enabled by adding a `key` method that picks a key from each partial record. The `argsFromKeys` method then transforms the list of picked keys into query arguments:

```js
const gatewaySchema = stitchSchemas({
  subschemas: [
    {
      schema: listingsSchema,
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

A `valuesFromResults` method may also be provided to map the raw query result into the batched set.

### Types without a database

It's logical to assume that each `usersByIds` query has a backing database table used to lookup the requested user IDs. However, this is frequently not the case! Here's a simple example that demonstrates how `User.listings` can be resolved without the listings service having any formal database concept of a User:

```js
const listingsData = [
  { id: '1', description: 'Junk for sale', price: 10.99, sellerId: '1', buyerId: '2' },
  { id: '2', description: 'Spare parts', price: 200.99, sellerId: '1', buyerId: null },
];

const listingsSchema = makeExecutableSchema({
  typeDefs: `
    type Listing {
      id: ID!
      description: String!
      price: Float!
      seller: User!
      buyer: User
    }

    type User {
      id: ID!
      listings: [Listing]!
    }

    type Query {
      listingsByIds(ids: [ID!]!): [Listing]!
      usersByIds(ids: [ID!]!): [User]!
    }
  `,
  resolvers: {
    Query: {
      listingsByIds: (root, args) => args.ids.map(id => listingsData.find(listing => listing.id === id)),
      usersByIds: (root, args) => args.ids.map(id => { id }),
    },
    User: {
      listings(user) {
        return listingsData.filter(listing => listing.sellerId === user.id);
      }
    }
  }
});
```

In this example, `usersByIds` simply converts the submitted IDs into stub records that get resolved as the local `User` type. This can be expanded even futher using a formal [pattern of injected keys](/docs/stitch-type-merging#injected-keys).

## Merging patterns

There are many ways to structure type merging, and none of them are wrong! The best ways depend on what makes sense in your schema. Here are some common merging patterns that can be mixed and matched...

### Stub types

The simplest pattern for providing a type across subschemas is to simply include an ID-only stub representing it where needed, and allow for external data to be merged onto the stub. For example:

```js
let listingsSchema = makeExecutableSchema({
  typeDefs: `
    type Listing {
      id: ID!
      description: String!
      price: Float!
      seller: User!
      buyer: User
    }

    # stubbed type...
    type User {
      id: ID!
    }

    type Query {
      listingById(id: ID!): Listing
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

When a stubbed type includes no other data beyond a shared key, then the type may be considered _unidirectional_ to the service&mdash;that is, the service holds no unique data that would require an inbound request to fetch it. In these cases, `merge` config may be omitted entirely for the stub type:

```js
const gatewaySchema = stitchSchemas({
  subschemas: [
    {
      schema: listingsSchema,
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

Stubbed types are easy to setup and effectively work as automatic [schema extensions](/docs/stitch-schema-extensions) (in fact, you might not need extensions!). A stubbed type may always be expanded with additional service-specific fields (see the [basic example](#basic-example)), however it requires a query in `merge` config as soon as it offers unique data.

In terms of performance, stubbed types match the capabilities of schema extensions&mdash;where one external delegation is required _per field_ referencing a stub type. For example, requesting both `buyer` and `seller` fields from a Listing will require two separate delegations to the users service to fetch their respective field selections, even when batching. More advanced patterns like injected keys (discussed below) can outperform stubbing by resolving entire portions of a type with a single delegation per external service.

### Injected keys

Until now we've always been putting a `User` concept into the listings service. However, what if we reversed that and put a `Listing` concept into the users service? This pattern has the gateway fetch a set of key fields from one or more initial schemas (listings), then send them as input to the target schema (users), and recieve back a complete type.

While this pattern is more sophisticated than stubbed types, it maximizes performance by effectively batching multiple fields of any type and selection&mdash;all with a single delegation. Here's a complete example:

```js
const listings = [
  { id: '1', description: 'Junk for sale', price: 10.99, sellerId: '1', buyerId: '2' },
  { id: '2', description: 'Spare parts', price: 200.99, sellerId: '1', buyerId: null },
];

const listingsSchema = makeExecutableSchema({
  typeDefs: `
    type Listing {
      id: ID!
      description: String!
      price: Float!
      sellerId: ID!
      buyerId: ID
    }

    type Query {
      listingsByIds(ids: [ID!]!): [Listing]!
    }
  `,
  resolvers: {
    Query: {
      listingsByIds: (root, args) => args.ids.map(id => listings.find(listing => listing.id === id)),
    }
  }
});

const users = [
  { id: '1', email: 'bigvader23@empire.me' },
  { id: '2', email: 'hanshotfirst@solo.net' },
];

const usersSchema = makeExecutableSchema({
  typeDefs: `
    type User {
      id: ID!
      email: String!
    }

    type Listing {
      seller: User!
      buyer: User
    }

    input ListingRepresentation {
      sellerId: ID
      buyerId: ID
    }

    type Query {
      _listingsByReps(representations: [ListingRepresentation!]!): [Listing]!
    }
  `,
  resolvers: {
    Query: {
      _listingsByReps: (obj, args) => args.representations,
    },
    Listing: {
      seller(listing) {
        return users.find(user => user.id === listing.sellerId);
      },
      buyer(listing) {
        return users.find(user => user.id === listing.buyerId) || null;
      }
    }
  }
});
```

Some important features to notice in the above schema:

- Listings service `Listing` now provides `buyerId` and `sellerId` keys rather than direct user associations.
- Users service `Listing` now _only_ provides `buyer` and `seller` associations without any need for a shared `id`.
- Users service defines a `ListingRepresentation` input for external keys, and a `_listingsByReps` query that recieves them.

To bring this all together, the gateway orchestrates collecting plain keys from the listing service, and then injects them as representations of external records into the users service...

```js
const gatewaySchema = stitchSchemas({
  subschemas: [
    {
      schema: listingsSchema,
      merge: {
        Listing: {
          selectionSet: '{ id }',
          fieldName: 'listingsByIds',
          key: ({ id }) => id,
          argsFromKeys: (obj) => ({ id: obj.id }),
        }
      }
    },
    {
      schema: usersSchema,
      merge: {
        Listing: {
          selectionSet: '{ sellerId buyerId }',
          fieldName: '_listingsByReps',
          key: ({ sellerId, buyerId }) => ({ sellerId, buyerId }),
          argsFromKeys: (representations) => ({ representations }),
        }
      }
    },
  ],
  mergeTypes: true
});
```

To recap, the gateway has selected `buyerId` and `sellerId` fields from the listings services, sent those keys as input over to the users service, and then recieved back a complete type resolved with multiple fields of any type and selection. Neat!

However, you may notice that both `buyerId` and `sellerId` keys are _always_ requested from the listing service, even though they are only needed when resolving their respective associations. If we were sensitive to costs associated with keys, then we could judiciously select only the keys needed for the query with a field-level selectionSet mapping:

```js
{
  schema: usersSchema,
  merge: {
    Listing: {
      fields: {
        seller: { selectionSet: '{ sellerId }' },
        buyer: { selectionSet: '{ buyerId }' },
      },
      fieldName: '_listingsByReps',
      key: ({ sellerId, buyerId }) => ({ sellerId, buyerId }),
      argsFromKeys: (representations) => ({ representations }),
    }
  }
}
```

One disadvantage of this pattern is that we end up with clutter&mdash;`buyerId`/`sellerId` are extra fields, and `buyer`/`seller` fields have gateway dependencies. To tidy things up, we can aggressively deprecate these fields in subschemas and then remove/normalize their behavior in the gateway using available transforms:

```js
import { RemoveDirectiveFields, RemoveDirectives } from '@graphql-tools/stitch';

const listingsSchema = makeExecutableSchema({
  typeDefs: `
    type Listing {
      id: ID!
      description: String!
      price: Float!
      sellerId: ID! @deprecated(reason: "stitching use only")
      buyerId: ID  @deprecated(reason: "stitching use only")
    }
  `
});

const usersSchema = makeExecutableSchema({
  typeDefs: `
    type User {
      id: ID!
      email: String!
    }

    type Listing {
      seller: User! @deprecated(reason: "gateway access only")
      buyer: User @deprecated(reason: "gateway access only")
    }
  `
});

const gatewaySchema = stitchSchemas({
  subschemas: [
    {
      schema: listingsSchema,
      transforms: [new RemoveDirectiveFields('deprecated', { reason: 'gateway access only' })],
      merge: { ... }
    },
    {
      schema: usersSchema,
      transforms: [new RemoveDirectives('deprecated', { reason: 'gateway access only' })],
      merge: { ... }
    },
  ],
});
```

### Federation services

If you're familiar with [Apollo Federation](https://www.apollographql.com/docs/apollo-server/federation/introduction/), then you may notice that the above pattern of injected keys looks familiar... You're right, it's very similar to the `_entities` service design of the [Federation schema specification](https://www.apollographql.com/docs/apollo-server/federation/federation-spec/).

In fact, type merging can seamlessly interface with Federation services by sending appropraitely formatted representations to their `_entities` query:

```js
{
  schema: usersSchema,
  merge: {
    Listing: {
      selectionSet: '{ sellerId buyerId }',
      fieldName: '_entities',
      key: ({ sellerId, buyerId }) => ({ sellerId, buyerId, __typename: 'Listing' }),
      argsFromKeys: (representations) => ({ representations }),
    }
  }
}
```

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

Type merging simply merges types of the same name, though it is smart enough to apply provided subschema transforms prior to merging. That means types have to be identical on the gateway, but not the individual subschema.

Finally, you may wish to fine-tune which types are merged. Besides taking a boolean value, you can also specify an array of type names, or a function of type `MergeTypeFilter` that takes the potential types and decides dynamically how to merge.

```ts
export type MergeTypeCandidate = {
  type: GraphQLNamedType;
  subschema?: GraphQLSchema | SubschemaConfig; // undefined if the type is added to the gateway directly, not from a subschema
  transformedSubschema?: GraphQLSchema; // the target schema of the above after any subschema config schema transformations are applied
};

export type MergeTypeFilter = (mergeTypeCandidates: Array<MergeTypeCandidate>, typeName: string) => boolean;
```
