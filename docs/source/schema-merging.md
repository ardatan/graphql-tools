---
title: Schema Merging
order: 310
description: Merge schemas together
---

Often it's a good idea to separate parts of a big schema, either just logically in code or even physically with different services. In addition, often it's  nice to be able to use the power of GraphQL when using 3rd party GraphQL  APIs. Schema merging helps with that - it lets one combine multiple GraphQL schemas together and produce a final schema that knows how to delegate parts of the query to relevant subschemas.

`mergeSchemas` is a primary API. It works with `GraphQLSchema` objects, so one have to create a *remote executable schema* for remote servers using [makeRemoteExecutableSchema](./remote-schemas.html)

The basic principle, is that GraphQLSchemas, remote or local, are used to define the self-contained parts of the full schema. A schema extension string passed along with the schemas can be used to extend types from those schemas and resolvers provide the implementation by them or override the default implementation `mergeSchema` provides for the root fields. If non-standard type merging behaviour is require, `onTypeConflict` provides a hook to do that.

When merged schema in executed, the context passed to it, will be passed to subschemas. This way one could, eg, set authentication headers for the remote schema or pass a database connection to a local one. When implementing or overriding resolvers, you can control how the context is passed directly, as it is one of the arguments of `delegate`.

## Example

In this example we'll have two very simple schemas. It's not important for this topic on whether they are local or remote, we assume they have some sort of resolvers ready and are executable.

`chirpSchema`

```graphql
type Chirp {
  id: ID!
  text: String
  authorId: ID!
}

type Query {
  chirpById(id: ID!): Property
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

We want to connect those schemas together, so we want to extend them so that you can get author's chirps from Author type and author from Chirp type.

`linkSchema`

```graphql
extend type User {
  chirps: [Chirp]
}

extend type Chirp {
  author: Author
}
```

We can now merge them together:

```js
mergeSchemas({
  schemas: [chirpSchema, authorSchema, linkSchema],
});
```

One can now query all queries, like `userById`, `chirpById` and `chirpsByAuthorId`, but quering `User.chirps` or `Chirp.author` will result in none, because we need to provide resolvers. When we encounter those fields we want them to be forwarded to revelant root call - `chirpsByAuthorId` and `userById`. For first, we need to make sure we have `id` of author available and for other `authorId`. We will use `fragment`   property to request that.

```js
mergeSchemas({
  schemas: [chirpSchema, authorSchema, linkSchema],
  resolvers: mergeInfo => ({
    User: {
      chirps: {
        fragment: `fragment UserFragment { id }`,
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
        fragment: `fragment ChirpFragment { authorId }`,
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

`schemas` can be both `GraphQLSchema` (but it has to be an executable schema) or strings. In case they are strings only extensions (`extend type`) will be used. Passing strings is useful to add fields to existing types to link schemas together.

#### resolvers

`resolvers` is an optional a function that takes one argument - `mergeInfo` and returns resolvers in [makeExecutableSchema](./resolvers.html) format. One addition to the resolver format is a possibility to specify a `fragment` for a resolver. `fragment` must be a GraphQL Fragment definition and allows specifying which fields from the subschema are required for the resolver to function correctly. Fragment either replaces a field (for fields that don't exist in the subschema) or are added alongside it.

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

`delegate` takes operation and root field names, together with GraphQL context
and resolve info, as well as arguments for the root field. It forwards query to
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
methods allows customization of this, for example by taking other type or
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
