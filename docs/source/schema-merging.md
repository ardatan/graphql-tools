---
title: Schema Merging
order: 310
description: Merge schemas together
---

Often it's a good idea to separate parts of a big schema, either just logically in code or even physically with different services. In addition, often it's  nice to be able to use the power of GraphQL when using 3rd party GraphQL  APIs. Schema merging helps with that - it lets one combine multiple GraphQL schemas together and produce a final schema that knows how to delegate parts of the query to relevant subschemas.

`mergeSchemas` is a primary API. It works with `GraphQLSchema` objects, so one have to create a *remote executable schema* for remote servers using [makeRemoteExecutableSchema](./remote-schemas.html)

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

`resolvers` is an optional a function that takes one argument - `mergeInfo` and
returns resolvers in [makeExecutableSchema](./resolvers.html) format.

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

## Example

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
