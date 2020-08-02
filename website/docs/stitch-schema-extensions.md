---
id: stitch-schema-extensions
title: Further integrate stitched schemas via extensions
sidebar_label: Schema extensions
---

While stitching many schemas into one is extremely useful for consolidating queries,

In practice, we will often want to introduce additional fields for working with the relationships between types that came from different subschemas.


### Adding resolvers between schemas

 For example, we might want to go from a particular user to their chirps, or from a chirp to its author. Or we might want to query a `latestChirps` field and then get the author of each of those chirps. If the only way to obtain a chirp's author is to call the `userById(id)` root query field with the `authorId` of a given chirp, and we don't know the chirp's `authorId` until we receive the GraphQL response, then we won't be able to obtain the authors as part of the same query.

To add this ability to navigate between types, we need to _extend_ existing types with new fields that translate between the types:

```js
const linkTypeDefs = `
  extend type User {
    chirps: [Chirp]
  }

  extend type Chirp {
    author: User
  }
`;
```

We can now merge these three schemas together:

```js
export const schema = stitchSchemas({
  subschemas: [
    { schema: chirpSchema, },
    { schema: authorSchema, },
  ],
  typeDefs: linkTypeDefs,
});
```

Note the new `typeDefs` option in parallel to the new `subschemas` option, which better expresses that these typeDefs are defined only within the outer gateway schemas.

We won't be able to query `User.chirps` or `Chirp.author` yet, however, because we still need to define resolvers for these new fields.

How should these resolvers be implemented? When we resolve `User.chirps` or `Chirp.author`, we want to _delegate_ to the relevant root fields. To get from a user to the user's chirps, for example, we'll want to use the `id` of the user to call `Query.chirpsByAuthorId`. And to get from a chirp to its author, we can use the chirp's `authorId` field to call the existing `Query.userById` field.

Resolvers can use the `delegateToSchema` function to forward parts of queries (or even whole new queries) to one of the subschemas that was passed to `stitchSchemas` (or any other schema).

In order to delegate to these root fields, we'll need to make sure we've actually requested the `id` of the user or the `authorId` of the chirp. To avoid forcing users to add these fields to their queries manually, resolvers on a merged schema can define a `selectionSet` property that specifies the required fields, and they will be added to the query automatically.

A complete implementation of schema stitching for these schemas might look like this:

```js
const schema = stitchSchemas({
  subschemas: [
    { schema: chirpSchema, },
    { schema: authorSchema, },
  ],
  typeDefs: linkTypeDefs,
  resolvers: {
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
            },
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

### Batch Delegation

Suppose there was an additional root field within the schema for chirps called `trendingChirps` that returned a list of the current most popular chirps, as well as an additonal field on the `Chirp` type called `chirpedAtUserId` that described the target of an individual chirp. Imagine as well that we used the above stitching strategy to add an additional new field on the `Chirp` type called `chirpedAtUser` so that we could write the following query:

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
```

The implementation could be something like this:

```js
const schema = stitchSchemas({
  subschemas: [chirpSchema, authorSchema],
  typeDefs: linkTypeDefs,
  resolvers: {
    // ...
    Chirp: {
      chirpedAtUser: {
        selectionSet: `{ chirpedAtUserId }`,
        resolve(chirp, _args, context, info) {
          return delegateToSchema({
            schema: authorSchema,
            operation: 'query',
            fieldName: 'userById',
            args: {
              id: chirp.chirpedAtUserId,
            },
            context,
            info,
          });
        },
      },
    },
    // ...
  },
});
```

The above query as written would cause the gateway to fire an additional query to our author schema for each trending chirp, with the exact same arguments and selection set!

Imagine, however, that the author schema had an additional root field `usersByIds` besides just `userById`. Because we know that for each member of a list, the arguments and selection set will always match, we can utilize batch delegation using the [DataLoader](https://www.npmjs.com/package/dataloader) pattern to combine the individual queries from the gateway into one batch to the `userByIds` root field instead of `userById`. The implementation would look very similar:

```js
const { batchDelegateToSchema } from '@graphql-tools/batchDelegate';

const schema = stitchSchemas({
  subschemas: [chirpSchema, authorSchema],
  typeDefs: linkTypeDefs,
  resolvers: {
    // ...
    Chirp: {
      chirpedAtUser: {
        selectionSet: `{ chirpedAtUserId }`,
        resolve(chirp, _args, context, info) {
          return batchDelegateToSchema({
            schema: authorSchema,
            operation: 'query',
            fieldName: 'usersByIds',
            key: chirp.chirpedAtUserId,
            mapKeysFn: (ids) => ({ ids }),
            context,
            info,
          });
        },
      },
    },
    // ...
  },
});
```

Batch delegation may be preferable over plain delegation whenever possible, as it reduces the number of requests significantly whenever the parent object type appears in a list!
