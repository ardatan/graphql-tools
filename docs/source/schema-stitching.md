---
title: Schema stitching
description: Combining multiple GraphQL APIs into one
---

Schema stitching is the ability to create a single GraphQL schema from multiple underlying GraphQL APIs.

One of the main benefits of GraphQL is that you can query all of your data as part of one schema, and get everything you need in one request. But as your schema grows, it might become cumbersome to manage it all as one codebase, and it starts to make sense to split it into different modules. You may also want to decompose your schema into separate microservices, which can be developed and deployed independently.

In both cases, you use `mergeSchemas` to combine multiple GraphQL schemas together and produce a merged schema that knows how to delegate parts of the query to the relevant subschemas. These subschemas can be either local to the server, or running on a remote server. They can even be services offered by 3rd parties, allowing you to connect to external data and create mashups.

In order to merge with a remote schema, you would first use [makeRemoteExecutableSchema](./remote-schemas.html) to create a local proxy for the schema that knows how to call the remote endpoint. You could then merge with that proxy the same way you would merge with a locally implemented schema.

## Example

In this example we'll stitch together two very simple schemas. It doesn't matter whether these are local or proxies created with `makeRemoteExecutableSchema`, because the merging itself would be the same.

`chirpSchema`

```graphql
type Chirp {
  id: ID!
  text: String
  authorId: ID!
}

type Query {
  chirpById(id: ID!): Chirp
  chirpsByAuthorId(authorId: ID!): [Chirp]
}
```

`authorSchema`

```graphql
type User {
  id: ID!
  email: String
}

type Query {
  userById(id: ID!): User
}
```

We can now merge these schemas by calling `mergeSchemas`:

```js
mergeSchemas({
  schemas: [chirpSchema, authorSchema],
});
```

This would give you a new schema with the root fields on `Query` from both schemas:

```graphql
type Query {
  chirpById(id: ID!): Chirp
  chirpsByAuthorId(authorId: ID!): [Chirp]
  userById(id: ID!): User
}
```

That means you now have a single schema that allows you to ask for `userById` and `chirpsByAuthorId` in one query for example.

In many cases however, you'll want to add the explicit ability to navigate from one schema to another. In this example, you'd want to be able to get from a particular author to its chirps, or from a chirp to its author. This is more than a convenience once you move beyond querying for objects by a specific id. If you want to get the authors for the `latestChirps` for example, you have no way of knowing the `authorId`s in advance, so you wouldn't be able to get the authors in the same query.

To add the ability to navigate between types, you'll usually want to extend existing types with fields that take you from one to the other, and you can do that by defining another schema:

`linkSchema`

```graphql
extend type User {
  chirps: [Chirp]
}

extend type Chirp {
  author: Author
}
```

We can now merge these three schemas together:

```js
mergeSchemas({
  schemas: [chirpSchema, authorSchema, linkSchema],
});
```

You won't be able to query `User.chirps` or `Chirp.author` yet however, because the merged schema doesn't have resolvers defined for these fields. We'll have to define our own implementation of these.

So what should these resolvers look like?

When we resolve `User.chirps` or `Chirp.author`, we want to delegate to the revelant root fields. To get from a user to its chirps for example, we'll want to use the `id` of the user to call `chirpsByAuthorId`. And to get from a chirp to its author, we can use the chirp's `authorId` field to call into `userById`.

Resolvers specified as part of `mergeSchema` have access to a `delegate` function that allows you to delegate to root fields.

In order to delegate to these root fields however, we'll need to make sure we've actually requested the `id` of the user or the `authorId` of the chirp. To avoid forcing users to add these to their queries manually, resolvers on a merged schema can define a fragment that specifies the required fields, and these will be added to the query automatically.

A complete implementation of schema stitching for these schemas would look like this:

```js
mergeSchemas({
  schemas: [chirpSchema, authorSchema, linkSchema],
  resolvers: mergeInfo => ({
    User: {
      chirps: {
        fragment: `fragment UserFragment on User { id }`,
        resolve(parent, args, context, info) {
          const authorId = parent.id;
          return mergeInfo.delegate(
            'query',
            'chirpsByAuthorId',
            {
              authorId,
            },
            context,
            info,
          );
        },
      },
    },
    Chirp: {
      author: {
        fragment: `fragment ChirpFragment on Chirp { authorId }`,
        resolve(parent, args, context, info) {
          const id = parent.authorId;
          return mergeInfo.delegate(
            'query',
            'authorById',
            {
              id,
            },
            context,
            info,
          );
        },
      },
    },
  }),
});
```

## API

### mergeSchemas

```
mergeSchemas({
  schemas: Array<GraphQLSchema | string>,
  resolvers?: (mergeInfo: MergeInfo) => IResolvers,
  onTypeConflict?: (
    left: GraphQLNamedType,
    right: GraphQLNamedType
  ) => GraphQLNamedType
})

type MergeInfo = {
  delegate(
    operation: 'query' | 'mutation',
    rootFieldName: string,
    args: any,
    context: any,
    info: GraphQLResolveInfo
  ) => any
}
```

#### schemas

`schemas` is an array of either `GraphQLSchema`s (they have to beexecutable schemas, meaning they have resolvers defined) or strings. For strings, only extensions (`extend type`) will be used. Passing strings is useful to add fields to existing types to link schemas together.

#### resolvers

`resolvers` is an optional function that takes one argument - `mergeInfo` - and returns resolvers in [makeExecutableSchema](./resolvers.html) format. One addition to the resolver format is the possibility to specify a `fragment` for a resolver. `fragment` must be a GraphQL fragment definition, and allows you to specify which fields from the subschema are required for the resolver to function correctly. Fragment either replaces a field (for fields that don't exist in the subschema) or are added alongside it.

```js
resolvers: mergeInfo => ({
  Booking: {
    property: {
      fragment: 'fragment BookingFragment on Booking { propertyId }',
      resolve(parent, args, context, info) {
        return mergeInfo.delegate(
          'query',
          'propertyById',
          {
            id: parent.propertyId,
          },
          context,
          info,
        );
      },
    },
  },
})
```

#### mergeInfo and delegate

`mergeInfo` currenty is an object with one propeprty - `delegate`.

`delegate` takes the operation type (`query` or `mutation`) and root field names, together with the GraphQL execution context
and resolve info, as well as arguments for the root field. It delegates to
one of the merged schema and makes sure that only relevant fields are requested.

```js
mergeInfo.delegate(
  'query',
  'propertyById',
  {
    id: parent.id,
  },
  context,
  info,
);
```

#### onTypeConflict

`onTypeConflict` lets you customize type resolving logic. Default logic is to
take the first encountered type of all the types with the same name. This
method allows customization of this behavior, for example by taking another type or
merging types together.

## Big example

```js
import {
  makeRemoteExecutableSchema,
  introspectSchema,
  mergeSchemas,
} from 'graphql-tools';
import { HttpLink, execute, makePromise } from 'apollo-link';

async function makeMergedSchema() {
  // Create remote executable schemas
  const PropertyLink = new HttpLink({
    uri: 'https://v7l45qkw3.lp.gql.zone/graphql',
  });
  const PropertyFetcher = operation =>
    makePromise(execute(PropertyLink, operation));
  const PropertySchema = makeRemoteExecutableSchema({
    schema: await introspectSchema(PropertyFetcher),
    fetcher: PropertyFetcher,
  });

  const BookingLink = new HttpLink({
    uri: 'https://41p4j4309.lp.gql.zone/graphql',
  });
  const BookingFetcher = operation =>
    makePromise(execute(BookingLink, operation));
  const PropertySchema = makeRemoteExecutableSchema({
    schema: await introspectSchema(BookingFetcher),
    fetcher: BookingFetcher,
  });

  // A small string schema extensions to add links between schemas
  const LinkSchema = `
    extend type Booking {
      property: Property
    }

    extend type Property {
      bookings(limit: Int): [Booking]
    }
  `;

  // merge actual schema
  const mergedSchema = mergeSchemas({
    schemas: [PropertySchema, BookingSchema, LinkSchema],
    // Define resolvers manually for links
    resolvers: mergeInfo => ({
      Property: {
        bookings: {
          fragment: 'fragment PropertyFragment on Property { id }',
          resolve(parent, args, context, info) {
            return mergeInfo.delegate(
              'query',
              'bookingsByPropertyId',
              {
                propertyId: parent.id,
                limit: args.limit ? args.limit : null,
              },
              context,
              info,
            );
          },
        },
      },
      Booking: {
        property: {
          fragment: 'fragment BookingFragment on Booking { propertyId }',
          resolve(parent, args, context, info) {
            return mergeInfo.delegate(
              'query',
              'propertyById',
              {
                id: parent.propertyId,
              },
              context,
              info,
            );
          },
        },
      },
    }),
  });

  return mergedSchema;
}
```
