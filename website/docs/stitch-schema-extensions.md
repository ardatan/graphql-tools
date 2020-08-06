---
id: stitch-schema-extensions
title: Extending stitched schemas
sidebar_label: Schema extensions
---

While stitching many schemas together is extremely useful for consolidating queries, in practice we'll often want to add additional association fields that connect types from across subschemas. Using schema extensions, we can define additional GraphQL fields that only exist in the combined top-level schema to forge these connections.

### Basic example

Going back to the Users and Chirps model:

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

Here we may want to navigate from a particular user to their chirps, or from a chirp to its author. This is possible by connecting a key field on an object to a corresponding root query:

- `Chirp.authorId -> userById(id)`
- `User.id -> chirpsByAuthorId(authorId)`

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

The `typeDefs` option provides type extentions (using the `extend` keyword) that add additional fields into the _combined_ schema, therefore they may cross-reference types from any subschema.

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

When resolving `User.chirps` and `Chirp.author`, we _delegate_ a reference to their corresponding root fields. Note that the structure of stitching resolvers is a bit unique: each resolver is an object with a `selectionSet` property and a `resolve` method:

#### selectionSet

```js
Chirp: {
  author: {
    selectionSet: `{ authorId }`,
    // ... resolve
  },
},
```

The `selectionSet` specifies the necessary field(s) from an object needed to query for its association(s). For example, `Chirp.author` will require that a Chirp provide its `authorId`. Rather than relying on incoming queries to manually request this ID, subschema requests will automatically include the selectionSet to guarentee these fields are pre-fetched.

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

By default, `delegateToSchema` assumes that the delegated operation will return the same GraphQL type as the resolved field. If this is not the case (say, the delegated query returns an array rather than a single instance), then you should manually pass a `returnType` option to `delegateToSchema` with the expected GraphQL result type, and handle transforming the result as needed in the resolver.

### Batch Delegation

Unfortunately, performing individual `delegateToSchema` calls can be fairly inefficient. Say that we request `Chirp.author` from an array of ten chirps&mdash;that would delegate ten individual user queries to the subschema! This becomes particularily inefficient when delegating to remote services. To improve this, we can instead delegate field resolvers in batches. This would request many users for many chirps all at once.

The first thing we'll need is a new query in the users service that fetches many users at once:

```graphql
usersByIds(ids: [ID!]!): [User]!
```

<!-- Suppose there was an additional root field within the schema for chirps called `trendingChirps` that returned a list of the current most popular chirps, as well as an additonal field on the `Chirp` type called `chirpedAtUserId` that described the target of an individual chirp. Imagine as well that we used the above stitching strategy to add an additional new field on the `Chirp` type called `chirpedAtUser` so that we could write the following query:

```graphql
query {
  trendingChirps {
    id
    text
    chirpedAtUser {
      id
      email
    }
  }
}
``` -->

With this new collection service available, we can now delegate `Chirp.author` requests in batches across many chirp records:

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

<!-- Imagine, however, that the author schema had an additional root field `usersByIds` besides just `userById`. Because we know that for each member of a list, the arguments and selection set will always match, we can utilize batch delegation using the [DataLoader](https://www.npmjs.com/package/dataloader) pattern to combine the individual queries from the gateway into one batch to the `userByIds` root field instead of `userById`. The implementation would look very similar: -->

Batch delegation may be preferable over plain delegation whenever possible, as it reduces the number of requests significantly whenever the parent object type appears in a list!

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
