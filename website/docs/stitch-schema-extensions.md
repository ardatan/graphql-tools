---
id: stitch-schema-extensions
title: Extending stitched schemas
sidebar_label: Schema extensions
---

While stitching many schemas together is extremely useful for consolidating queries, in practice we'll often want to add additional association fields that connect types from across subschemas. Using schema extensions, we can define additional GraphQL fields that only exist in the combined top-level schema to establish these connections.

### Basic example

Going back to the Chirps and Authors services:

```js
import { makeExecutableSchema } from '@graphql-tools/schema';

const chirpSchema = makeExecutableSchema({
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

// setup subschema config objects
const chirpSubschema = { schema: chirpSchema };
const authorSubschema = { schema: authorSchema };
```

We may want to navigate from a particular user to their chirps, or from a chirp to its author. This is possible by connecting an existing object key to a corresponding root query:

- `Chirp.authorId -> userById(id)` (chirp author)
- `User.id -> chirpsByAuthorId(authorId)`  (user chirps)

To formalize this navigation in our gateway schema, we can _extend_ each type with a new field that translates its respective key field into an actual association:

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

The `typeDefs` option provides type extentions (using the `extend` keyword) that add additional fields into the _combined_ schema, and therefore may cross-reference types from any subschema.

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

When resolving `User.chirps` and `Chirp.author`, we _delegate_ the key reference to its corresponding root query. Note that the structure of stitching resolvers is unique in that each resolver is an object with a `selectionSet` property and a `resolve` method...

#### selectionSet

```js
Chirp: {
  author: {
    selectionSet: `{ authorId }`,
    // ... resolve
  },
},
```

The `selectionSet` specifies the key field(s) needed from an object to query for its associations. For example, `Chirp.author` will require that a Chirp provide its `authorId`. Rather than relying on incoming queries to manually request this key for the association, the selectionSet will automatically be included in subschema requests to guarentee these fields are fetched.

#### resolve

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

### Batch Delegation

Unfortunately, performing individual `delegateToSchema` calls can be fairly inefficient. Say we request `Chirp.author` from an array of ten chirps&mdash;that would delegate ten individual `userById` queries while resolving each author! To improve this, we can instead delegate in _batches_, where many instances of a field resolver are consolidated into one delegation.

To setup batching, the first thing we'll need is a new query in the authors service that allows fetching many users at once:

```graphql
usersByIds(ids: [ID!]!): [User]!
```

With this many-users query available, we can now delegate the `Chirp.author` field in batches across many Chirp records:

```js
import { batchDelegateToSchema } from '@graphql-tools/batchDelegate';

const schema = stitchSchemas({
  subschemas: [chirpSubschema, authorSubschema],
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
            mapKeysFn: (ids) => ({ ids }),
            context,
            info,
          });
        },
      },
    },
  },
});
```

Internally, `batchDelegateToSchema` wraps a single `delegateToSchema` call in a [DataLoader](https://www.npmjs.com/package/dataloader) scoped by context, field, arguments, and object selection. It assumes that the delegated operation will return an array of the field's named GraphQL type (ex: a `User` field would delegate to a `[User]` query). If this is not the case, then you should manually provide a `returnType` option citing the expected GraphQL return type.

Batch delegation is generally preferable over plain delegation because it eliminates the redundancy of requesting the same field across an array of parent objects. However, there is still one subschema request made _per batched field_&mdash;for remote services, this may create many network requests sent to the same service. This can be optimized with an additional layer of network-level batching using a package such as [apollo-link-batch-http](https://www.apollographql.com/docs/link/links/batch-http/).

### Passing arguments between resolvers

As a stitching implementation scales, we encounter situations where it's impractical to pass around exhaustive sets of records between services. For example, what if a User has tens of thousands of Chirps? We'll want to add scoping arguments into our gateway schema to address this:

```js
const linkTypeDefs = `
  extend type User {
    chirps(since: DateTime): [Chirp]
  }
`;
```

This argument in the gateway schema won't do anything until passed through to the underlying subservice requests. How we pass this input through depends on which subservice manages the association data.

First, let's say that the Chirps service manages the association and implements a `since` param for scoping the returned Chirp results. This simply requires passing the resolver argument through to `delegateToSchema`:

```js
export default {
  User: {
    chirps: {
      selectionSet: `{ id }`,
      resolve(user, args, context, info) {
        return delegateToSchema({
          schema: chirpSchema,
          operation: 'query',
          fieldName: 'chirpsByAuthorId',
          args: {
            authorId: user.id,
            since: args.since
          },
          context,
          info,
        });
      },
    },
  }
};
```

Alternatively, let's say that the Users service manages the association and implements a `User.chirpIds(since: DateTime):[Int]` method to stitch from. In this configuration, resolver arguments will need to passthrough with the initial `selectionSet` for User data. The `forwardArgsToSelectionSet` helper handles this:

```js
import { forwardArgsToSelectionSet } from '@graphql-tools/stitch';

export default {
  User: {
    chirps: {
      selectionSet: forwardArgsToSelectionSet('{ chirpIds }'),
      resolve(user, args, context, info) {
        return delegateToSchema({
          schema: chirpSchema,
          operation: 'query',
          fieldName: 'chirpsById',
          args: {
            ids: user.chirpIds,
          },
          context,
          info,
        });
      },
    },
  }
};
```

By default, `forwardArgsToSelectionSet` will passthrough all arguments from the gateway field to _all_ root fields in the selection set. For complex selections that request multiple fields, you may provide an additional mapping of selection names with their respective arguments:

```js
forwardArgsToSelectionSet('{ id chirpIds }', { chirpIds: ['since'] })
```

Note that a dynamic `selectionSet` is simply a function that recieves a GraphQL `FieldNode` (the gateway field) and returns a `SelectionSetNode`. This dynamic capability can support a wide range of custom stitching configurations.

## Transforms

Now let's implement the resolvers:

```ts
const chirpSubschema = {
  schema: chirpSchema,
  transforms: chirpSchemaTransforms,
}

export const schema = stitchSchemas({
  subschemas: [
    chirpSubschema,
    { schema: authorSchema },
  ],
  typeDefs: linkTypeDefs,

  resolvers: {
    User: {
      chirps: {
        selectionSet: `{ id }`,
        resolve(user, args, context, info) {
          return delegateToSchema({
            schema: chirpSubschema,
            operation: 'query',
            fieldName: 'chirpsByAuthorId',
            args: {
              authorId: user.id,
            },
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
            schema: authorSchema,
            operation: 'query',
            fieldName: 'userById',
            args: {
              id: chirp.authorId,
            },
            context,
            info,
          });
        },
      },
    },
  },
});
```

Notice that when we call `delegateToSchema` in the `User.chirps` resolvers, we can delegate to the original `chirpsByAuthorId` field, even though it has been filtered out of the final schema.
