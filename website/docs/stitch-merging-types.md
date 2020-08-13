---
id: stitch-merging-types
title: Type Merging
sidebar_label: Type Merging
---

Type merging offers an alternative strategy to [schema extensions]() for bridging types across subschemas. It allows _partial definitions_ of a type to exist in any subschema, and then merges all partials into one unified type in the gateway schema. When querying for a merged type, the gateway smartly delegates portions of the request to each relevant subschema in dependency order, and then combines all results for the final return.

Using type merging frequently eliminates the need for schema extensions, though does not preclude their use. Merging can often outperform extensions by resolving entire portions of an object tree with a single delegation. More broadly, it offers similar capabilities to [Apollo Federation](https://www.apollographql.com/docs/apollo-server/federation/introduction/) while using only plain GraphQL and bare-metal configuration.

### Basic example

Type merging encourages types to be split naturally across services by concern. For example, let's make a small classifieds app where users may post listings for sale to other users. Separating listings from users might look like this:

```js
import { makeExecutableSchema } from '@graphql-tools/schema';
import { addMocksToSchema } from '@graphql-tools/mock';

let usersSchema = makeExecutableSchema({
  typeDefs: `
    type User {
      id: ID!
      username: String!
      email: String!
    }

    type Query {
      userById(id: ID!): User
    }
  `
});

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

// just mock the schemas for now to make them return dummy data
usersSchema = addMocksToSchema({ schema: usersSchema });
listingsSchema = addMocksToSchema({ schema: listingsSchema });
```

Note that both services define a `User` type. While the users service manages information about the user account, the listings service appropraitely provides listings associated with the user ID. Now we just have to configure the `User` type to be merged:

```js
import { stitchSchemas } from '@graphql-tools/stitch';

const gatewaySchema = stitchSchemas({
  subschemas: [
    {
      schema: usersSchema,
      merge: {
        User: {
          fieldName: 'userById',
          selectionSet: '{ id }',
          args: (userEntity) => ({ id: userEntity.id }),
        }
      }
    },
    {
      schema: listingsSchema,
      merge: {
        User: {
          fieldName: 'userById',
          selectionSet: '{ id }',
          args: (userEntity) => ({ id: userEntity.id }),
        }
      }
    },
  ],
  mergeTypes: true
});
```

That's it! When setting up merge config, each subschema simply provides a query for accessing its respective type entity (i.e.: version of the type&mdash;services without an expression of the type may omit this query). The `fieldName` specifies a query, `selectionSet` specifies one or more key fields required from the initial entity, and `args` formats the initial entity into query arguments. This config allows type merging to smartly query a complete `User`, regardless of which service provides the initial entity.

The `User` schema now looks like this in the gateway:

```graphql
type User {
  id: ID!
  username: String!
  email: String!
  listings: [Listing]!
}
```

#### With batching

One big problem in the example above is that subschemas are being queried for one `User` entity at a time via `userById`. These single queries get expensive, especially when resolving lists. This can be avoided by setting up array queries for batching:

```graphql
usersByIds(ids: [ID!]!): [User]!
```

Once each service provides an array query, batching may be enabled by adding a `key` method to pick a key from each entity. The `args` method then translates the list of keys into query arguments:

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
          args: (ids) => ({ ids }),
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
          args: (ids) => ({ ids }),
        }
      }
    },
  ],
  mergeTypes: true
});
```

#### Services without a database

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
      listingsByIds: (root, args) => args.ids.map(id => listings.find(listing => listing.id === id)),
      usersByIds: (root, args) => args.ids.map(id => { id }),
    },
    User: {
      listings(user) {
        return listings.filter(listing => listing.sellerId === user.id);
      }
    }
  }
});
```

### Unidrectional merging

```js
import { makeExecutableSchema } from '@graphql-tools/schema';
import { addMocksToSchema } from '@graphql-tools/mock';
import { stitchSchemas } from '@graphql-tools/stitch';

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
      username: String!
    }

    type Query {
      usersByIds(ids: [ID!]!): [User]!
    }
  `
});

listingsSchema = addMocksToSchema({ schema: listingsSchema });
usersSchema = addMocksToSchema({ schema: usersSchema });

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
          args: (ids) => ({ ids }),
        }
      }
    },
  ],
  mergeTypes: true
});
```

### Injected representations

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
  { id: '1', username: 'bigvader23' },
  { id: '2', username: 'hanshotfirst' },
];

const usersSchema = makeExecutableSchema({
  typeDefs: `
    type User {
      id: ID!
      username: String!
    }

    type Listing {
      id: ID!
      seller: User!
      buyer: User
    }

    input ListingRepresentation {
      id: ID!
      sellerId: ID
      buyerId: ID
    }

    type Query {
      _listingsByRepresentations(representations: [ListingRepresentation!]!): [Listing]!
    }
  `,
  resolvers: {
    Query: {
      _listingsByRepresentations: (obj, args) => args.representations,
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

const gatewaySchema = stitchSchemas({
  subschemas: [
    {
      schema: listingsSchema,
      merge: {
        Listing: {
          selectionSet: '{ id }',
          fieldName: 'listingsByIds',
          args: (obj) => ({ id: obj.id }),
        }
      }
    },
    {
      schema: usersSchema,
      merge: {
        Listing: {
          selectionSet: '{ id sellerId buyerId }',
          fieldName: '_listingsByRepresentations',
          key: ({ id, sellerId, buyerId }) => ({ id, sellerId, buyerId }),
          args: (representations) => ({ representations }),
        }
      }
    },
  ],
  mergeTypes: true
});
```

```js
const usersSubschema = {
  schema: usersSchema,
  merge: {
    Listing: {
      selectionSet: '{ id }',
      fields: {
        seller: { selectionSet: '{ sellerId }' },
        buyer: { selectionSet: '{ buyerId }' },
      },
      fieldName: '_listingsByRepresentations',
      key: ({ id, sellerId, buyerId }) => ({ id, sellerId, buyerId }),
      args: (representations) => ({ representations }),
    }
  }
}
```


The `merge` property on the `SubschemaConfig` object determines how types are merged, and is a map of `MergedTypeConfig` objects:

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

export type MergedTypeResolver = (
  originalResult: any, // initial final result from a subschema
  context: Record<string, any>, // gateway context
  info: GraphQLResolveInfo, // gateway info
  subschema: GraphQLSchema | SubschemaConfig, // the additional implementing subschema from which to retrieve data
  selectionSet: SelectionSetNode // the additional fields required from that subschema
) => any;
```

Type merging simply merges types with the same name, but is smart enough to apply the passed subschema transforms prior to merging types, so the types have to be identical on the gateway, not the individual subschema.

All merged types returned by any subschema will delegate as necessary to subschemas also implementing the type, using the provided `resolve` function of type `MergedTypeResolver`.

You can also use batch delegation instead of simple delegation by delegating to a root field returning a list and using the `key`, `argsFromKeys`, and `valuesFromResults` properties. See the [batch delegation](#batch-delegation) for more details.

The simplified magic above happens because if left unspecified, we provide a default type-merging resolver for you, which uses the other `MergedTypeConfig` options (for simple delegation), as follows:

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

When providing your own type-merging resolver, note the very important `skipTypeMerging` setting. Without this option, your gateway will keep busy merging types forever, as each result returned from each subschema will trigger another round of delegation to the other implementing subschemas!

Finally, you may wish to fine-tune which types are merged. Besides taking a boolean value, you can also specify an array of type names, or a function of type `MergeTypeFilter` that takes the potential types and decides dynamically how to merge.

```ts
export type MergeTypeCandidate = {
  type: GraphQLNamedType;
  subschema?: GraphQLSchema | SubschemaConfig; // undefined if the type is added to the gateway directly, not from a subschema
  transformedSubschema?: GraphQLSchema; // the target schema of the above after any subschema config schema transformations are applied
};

export type MergeTypeFilter = (mergeTypeCandidates: Array<MergeTypeCandidate>, typeName: string) => boolean;
```
