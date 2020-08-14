---
id: stitch-schema-extensions
title: Extending stitched schemas
sidebar_label: Schema extensions
---

While stitching many schemas together is extremely useful for consolidating queries, in practice we'll often want to add additional association fields that connect types to one another across subschemas. Using schema extensions, we can define additional GraphQL fields that only exist in the combined gateway schema that establish these connections.

While considering these capabilities, be sure to compare them with the newer automated features available through [type merging](/docs/stitch-type-merging).

## Basic example

Going back to the chirps and authors service example:

```js
import { makeExecutableSchema } from '@graphql-tools/schema';
import { addMocksToSchema } from '@graphql-tools/mock';

let chirpSchema = makeExecutableSchema({
  typeDefs: `
    type Chirp {
      id: ID!
      text: String
      authorId: ID!
    }

    type Query {
      chirpById(id: ID!): Chirp
      chirpsByAuthorId(authorId: ID!): [Chirp!]!
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

// setup subschema config objects
export const chirpSubschema = { schema: chirpSchema };
export const authorSubschema = { schema: authorSchema };
```

We may want to navigate from a particular user to their chirps, or from a chirp to its author. This is possible within our service architecture by connecting an existing key of each object to a corresponding root query:

- `Chirp.authorId -> userById(id)` gets a Chirp's author.
- `User.id -> chirpsByAuthorId(authorId)` gets a User's chirps.

To formalize this navigation within our gateway schema, we can _extend_ each type with a new field that will translate its respective key into an actual object association:

```js
import { stitchSchemas } from '@graphql-tools/stitch';

export const schema = stitchSchemas({
  subschemas: [
    chirpSubschema,
    authorSubschema,
  ],
  typeDefs: `
    extend type Chirp {
      author: User!
    }
    extend type User {
      chirps: [Chirp!]!
    }
  `
});
```

The `typeDefs` option provides type extentions (using the `extend` keyword) that add additional fields into the _combined_ gateway schema, and therefore may cross-reference types from any subschema.

However, these extensions alone won't do anything until they have corresponding resolvers. A complete example would look like this:

```js
import { stitchSchemas } from '@graphql-tools/stitch';
import { delegateToSchema } from '@graphql-tools/delegate';

export const schema = stitchSchemas({
  subschemas: [
    chirpSubschema,
    authorSubschema,
  ],
  typeDefs: `
    extend type Chirp {
      author: User!
    }
    extend type User {
      chirps: [Chirp!]!
    }
  `,
  resolvers: {
    User: {
      chirps: {
        selectionSet: `{ id }`,
        resolve(user, args, context, info) {
          return delegateToSchema({
            schema: chirpSubschema,
            operation: 'query',
            fieldName: 'chirpsByAuthorId',
            args: { authorId: user.id },
            context,
            info,
          });
        },
      },
    },
    Chirp: {
      author: {
        selectionSet: `{ authorId }`,
        resolve(chirp, args, context, info) {
          return delegateToSchema({
            schema: authorSubschema,
            operation: 'query',
            fieldName: 'userById',
            args: { id: chirp.authorId },
            context,
            info,
          });
        },
      },
    },
  }
});
```

When resolving `User.chirps` and `Chirp.author`, we _delegate_ each key reference to its corresponding root query. Note that the structure of stitching resolvers has a `selectionSet` property and a `resolve` method.

### selectionSet

```js
Chirp: {
  author: {
    selectionSet: `{ authorId }`,
    // ... resolve
  },
},
```

The `selectionSet` specifies the key field(s) needed from an object to query for its associations. For example, `Chirp.author` will require that a Chirp provide its `authorId`. Rather than relying on incoming queries to manually request this key for the association, the selection set will automatically be included in subschema requests to guarentee that these fields are fetched. Dynamic selection sets are also possible by providing a function that recieves a GraphQL `FieldNode` (the gateway field) and returns a `SelectionSetNode`.

### resolve

```js
Chirp: {
  author: {
    // ... selectionSet
    resolve(chirp, args, context, info) {
      return delegateToSchema({
        schema: authorSubschema,
        operation: 'query',
        fieldName: 'userById',
        args: { id: chirp.authorId },
        context,
        info,
      });
    },
  },
},
```

Resolvers use the `delegateToSchema` function to forward parts of queries (or even whole new queries) to any other schema&mdash;inside _or outside_ of the stitched schema. When delegating to a stitched subschema, always provide the complete [subschema config](/docs/stitch-combining-schemas#subschema-configs) object as the `schema` option.

By default, `delegateToSchema` assumes that the delegated operation will return the same GraphQL type as the resolved field (ex: a `User` field would delegate to a `User` query). If this is not the case, then you should manually provide a `returnType` option citing the expected GraphQL return type, and transform the result accordingly in the resolver.

## Batch delegation

The drawback of performing individual `delegateToSchema` calls is that they can be fairly inefficient. Say we request `Chirp.author` from an array of ten chirps&mdash;that would delegate ten individual `userById` queries while resolving each author! To improve this, we can instead delegate in _batches_, where many instances of a field resolver are consolidated into one delegation.

To setup batching, the first thing we'll need is a new query in the authors service that allows fetching many users at once:

```graphql
usersByIds(ids: [ID!]!): [User]!
```

With this many-users query available, we can now delegate the `Chirp.author` field in batches across many records:

```js
import { batchDelegateToSchema } from '@graphql-tools/batch-delegate';

const schema = stitchSchemas({
  subschemas: [
    chirpSubschema,
    authorSubschema,
  ],
  typeDefs: `
    extend type Chirp {
      author: User!
    }
  `,
  resolvers: {
    Chirp: {
      author: {
        selectionSet: `{ authorId }`,
        resolve(chirp, _args, context, info) {
          return batchDelegateToSchema({
            schema: authorSubschema,
            operation: 'query',
            fieldName: 'usersByIds',
            key: chirp.authorId,
            argsFromKeys: (ids) => ({ ids }),
            context,
            info,
          });
        },
      },
    },
  },
});
```

Internally, `batchDelegateToSchema` wraps a single `delegateToSchema` call in a [DataLoader](https://www.npmjs.com/package/dataloader) scoped by context, field, arguments, and query selection. It assumes that the delegated operation will return an array of objects matching the gateway field's named GraphQL type (ex: a `User` field delegates to a `[User]` query). If this is not the case, then you should manually provide a `returnType` option citing the expected GraphQL return type.

Batch delegation is generally preferable over plain delegation because it eliminates the redundancy of requesting the same field across an array of parent objects. Even so, delegation costs can add up because there is still one subschema request made _per batched field_&mdash;for remote services, this may create many network requests sent to the same service. Consider enabling an additional layer of network-level batching with a package such as [apollo-link-batch-http](https://www.apollographql.com/docs/link/links/batch-http/) to consolidate requests per subschema.

## Passing gateway arguments

Exhaustive accessors like `User.chirps` do not scale well (...what happens when a user has tens of thousands of chirps?), so the gateway should probably accept scoping arguments and pass them through to the underlying subschemas. Let's add a `pageNumber` argument to the `User.chirps` schema extension:

```graphql
extend type User {
  chirps(pageNumber: Int=1): [Chirp]!
}
```

This argument only exists in the gateway schema and won't do anything until passed through to subschemas. How we pass this input through depends on which subservice owns the association data...

### Via delegation

First, let's say that the Chirps service defines this association. The first thing we'll need is a corresponding argument in the chirps query; and while we're at it, let's also support batching:

```graphql
chirpPagesByAuthorIds(authorIds: [ID!]!, pageNumber: Int=1): [[Chirp!]!]!
```

This `chirpPagesByAuthorIds` query is a very primitive example of pagination, and simply returns an array of chirps for each author ID. Now we just need to pass the resolver's page number argument through to `batchDelegateToSchema`, and manually specify a `returnType` that matches the pagination format:

```js
User: {
  chirps: {
    selectionSet: `{ id }`,
    resolve(user, args, context, info) {
      return batchDelegateToSchema({
        schema: chirpsSubschema,
        operation: 'query',
        fieldName: 'chirpPagesByAuthorIds',
        key: user.id,
        argsFromKeys: (authorIds) => ({ authorIds, pageNumber: args.pageNumber }),
        returnType: new GraphQLList(new GraphQLList(chirpsSubschema.schema.getType('Chirp'))),
        context,
        info,
      });
    },
  },
}
```

### Via selectionSet

Alternatively, let's say that users and chirps have a many-to-many relationship and the users service owns the association data. That might give us a `User.chirpIds` field to stitch from:

```graphql
User.chirpIds(pageNumber: Int=1): [ID]!
```

In this configuration, resolver arguments will need to pass through with the initial `selectionSet`. The `forwardArgsToSelectionSet` helper handles this:

```js
import { forwardArgsToSelectionSet } from '@graphql-tools/stitch';
//...
User: {
  chirps: {
    selectionSet: forwardArgsToSelectionSet('{ chirpIds }'),
    resolve(user, args, context, info) {
      return batchDelegateToSchema({
        schema: chirpsSubschema,
        operation: 'query',
        fieldName: 'chirpsByIds',
        key: user.chirpIds,
        argsFromKeys: (ids) => ({ ids }),
        context,
        info,
      });
    },
  },
}
```

By default, `forwardArgsToSelectionSet` will pass through all arguments from the gateway field to _all_ root fields in the selection set. For complex selections that request multiple fields, you may provide an additional mapping of selection names with their respective arguments:

```js
forwardArgsToSelectionSet('{ id chirpIds }', { chirpIds: ['pageNumber'] })
```

## Extending transformed schemas

[Transformed schemas](/docs/stitch-combining-schemas#adding-transforms) are nuanced because they involve two versions of the same schema: the original schema, and the transformed gateway schema. When extending a transformed schema, we extend the gateway schema but delegate to the original schema. For example:

```js
import { makeExecutableSchema } from '@graphql-tools/schema';
import { addMocksToSchema } from '@graphql-tools/mock';
import { stitchSchemas } from '@graphql-tools/stitch';
import { delegateToSchema } from '@graphql-tools/delegate';
import { FilterRootFields, RenameTypes } from '@graphql-tools/wrap';

const chirpSchema = makeExecutableSchema({
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

const chirpSubschema = {
  schema: addMocksToSchema({ schema: chirpSchema }),
  transforms: [
    // remove the "chirpsByAuthorId" root field
    new FilterRootFields((op, field) => field !== 'chirpsByAuthorId'),
    // prefix all type names with "Chirp_"
    new RenameTypes((name) => `Chirp_${name}`),
  ],
};

const authorSchema = makeExecutableSchema({
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

const authorSubschema = {
  schema: addMocksToSchema({ schema: authorSchema })
};

const stitchedSchema = stitchSchemas({
  subschemas: [
    chirpSubschema,
    authorSubschema,
  ],
  typeDefs: `
    extend type User {
      chirps: [Chirp_Chirp!]!
    }
    extend type Chirp_Chirp {
      author: User!
    }
  `,
  resolvers: {
    User: {
      chirps: {
        selectionSet: `{ id }`,
        resolve(user, args, context, info) {
          return delegateToSchema({
            schema: chirpSubschema,
            operation: 'query',
            fieldName: 'chirpsByAuthorId',
            args: { authorId: user.id },
            context,
            info,
          });
        },
      },
    },
    Chirp_Chirp: {
      author: {
        selectionSet: `{ authorId }`,
        resolve(chirp, args, context, info) {
          return delegateToSchema({
            schema: authorSubschema,
            operation: 'query',
            fieldName: 'userById',
            args: { id: chirp.authorId },
            context,
            info,
          });
        },
      },
    },
  },
});
```

A few key points to note here:

- All schema extensions and their resolvers exist in the gateway schema, and therefore refer to the transformed type name `Chirp_Chirp`.

- Delegations refer to the original subschema, and therefore may reference fields such as `chirpsByAuthorId` that have been removed from the gateway schema.
