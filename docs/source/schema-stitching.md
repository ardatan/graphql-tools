---
title: Schema stitching
description: Combining multiple GraphQL APIs into one
---

Schema stitching is the ability to create a single GraphQL schema from multiple underlying GraphQL APIs.

One of the main benefits of GraphQL is that you can query all of your data as part of one schema, and get everything you need in one request. But as your schema grows, it might become cumbersome to manage it all as one codebase, and it starts to make sense to split it into different modules. You may also want to decompose your schema into separate microservices, which can be developed and deployed independently.

In both cases, you use `mergeSchemas` to combine multiple GraphQL schemas together and produce a merged schema that knows how to delegate parts of the query to the relevant subschemas. These subschemas can be either local to the server, or running on a remote server. They can even be services offered by 3rd parties, allowing you to connect to external data and create mashups.

<h2 id="remote-schemas" title="Remote schemas">Working with remote schemas</h2>

In order to merge with a remote schema, you should first use [makeRemoteExecutableSchema](./remote-schemas.html) to create a local proxy for the schema that knows how to call the remote endpoint. You can then merge with that proxy the same way you would merge with a locally implemented schema.

<h2 id="basic-example">Basic example</h2>

In this example we'll stitch together two very simple schemas. It doesn't matter whether these are local or proxies created with `makeRemoteExecutableSchema`, because the merging itself would be the same.

In this case, we're dealing with two schemas that implement a system with authors and "chirps" - small snippets of text that they can post.

```js
import {
  makeExecutableSchema,
  addMockFunctionsToSchema,
  mergeSchemas,
} from 'graphql-tools';

// Mocked chirp schema; we don't want to worry about the schema
// implementation right now since we're just demonstrating
// schema stitching
const chirpSchema = makeExecutableSchema({
  typeDefs: `
    type Chirp {
      id: ID!
      text: String
      authorId: ID!
    }

    type Query {
      chirpById(id: ID!): Chirp
      chirpsByAuthorId(authorId: ID!): [Chirp]
    }
  `
});

addMockFunctionsToSchema({ schema: chirpSchema });

// Mocked author schema
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

// This function call adds the mocks to your schema!
addMockFunctionsToSchema({ schema: authorSchema });

export const schema = mergeSchemas({
  schemas: [
    chirpSchema,
    authorSchema,
  ],
});
```

[Run the above example on Launchpad.](https://launchpad.graphql.com/1nkk8vqj9)

This gives you a new schema with the root fields on `Query` from both schemas:

```graphql
type Query {
  chirpById(id: ID!): Chirp
  chirpsByAuthorId(authorId: ID!): [Chirp]
  userById(id: ID!): User
}
```

That means you now have a single schema that allows you to ask for `userById` and `chirpsByAuthorId` in one query for example.

<h3 id="adding-resolvers">Adding resolvers between schemas</h3>

Proxying the root fields is a great start, but many cases however you'll want to add the ability to navigate from one schema to another. In this example, you might want to be able to get from a particular author to their chirps, or from a chirp to its author. This is more than a convenience once you move beyond querying for objects by a specific id. If you want to get the authors for the `latestChirps` for example, you have no way of knowing the `authorId`s in advance, so you wouldn't be able to get the authors in the same query.

To add the ability to navigate between types, you need to extend existing types with fields that can take you from one to the other. You can do that the same way you add the other parts of the schema:

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
mergeSchemas({
  schemas: [
    chirpSchema,
    authorSchema,
    linkTypeDefs,
  ],
});
```

You won't be able to query `User.chirps` or `Chirp.author` yet however, because the merged schema doesn't have resolvers defined for these fields. We'll have to define our own implementation of these.

So what should these resolvers look like?

When we resolve `User.chirps` or `Chirp.author`, we want to delegate to the relevant root fields. To get from a user to its chirps for example, we'll want to use the `id` of the user to call `chirpsByAuthorId`. And to get from a chirp to its author, we can use the chirp's `authorId` field to call into `userById`.

Resolvers specified as part of `mergeSchema` have access to a `delegateToSchema` function that allows you to delegate to subschemas.

In order to delegate to these root fields, we'll need to make sure we've actually requested the `id` of the user or the `authorId` of the chirp. To avoid forcing users to add these to their queries manually, resolvers on a merged schema can define a fragment that specifies the required fields, and these will be added to the query automatically.

A complete implementation of schema stitching for these schemas would look like this:

```js
mergeSchemas({
  schemas: [
    chirpSchema,
    authorSchema,
    linkTypeDefs,
  ],
  resolvers: {
    User: {
      chirps: {
        fragment: `fragment UserFragment on User { id }`,
        resolve(parent, args, context, info) {
          const authorId = parent.id;
          return info.mergeInfo.delegateToSchema({
            schema: chirpSchema,
            operation: 'query',
            fieldName: 'chirpsByAuthorId',
            args: {
              authorId,
            },
            context,
            info,
          });
        },
      },
    },
    Chirp: {
      author: {
        fragment: `fragment ChirpFragment on Chirp { authorId }`,
        resolve(parent, args, context, info) {
          const id = parent.authorId;
          return info.mergeInfo.delegateToSchema({
            schema: authorSchema,
            operation: 'query',
            fieldName: 'userById',
            args: {
              id,
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

[Run the above example on Launchpad.](https://launchpad.graphql.com/8r11mk9jq)

<h2 id="using-with-transforms">Using with Transforms</h2>

Often, when creating gateways, one might want to modify one of the schemas. The most common tasks include renaming some of the types, filter or removing some of the root fields. By using [transforms](./schema-transforms) with schema stitching, one can do it without much manual work.

While normally, one delegates directly to the schema that is merged, when schemas are transformed, one often need to delegate to original, untransformed schema. For example, even if some root fields are modified, it's often required to still use those root fields inside of the resolvers, for example for links.

In this example, we'll namespace `Chirp` schema and remove `chirpsByAuthorId` from it, by using transforms built-in into `graphql-tools`.

```js
import {
  makeExecutableSchema,
  addMockFunctionsToSchema,
  mergeSchemas,
  Transforms,
  transformSchema,
} from 'graphql-tools';

// Mocked chirp schema; we don't want to worry about the schema
// implementation right now since we're just demonstrating
// schema stitching
const chirpSchema = makeExecutableSchema({
  typeDefs: `
    type Chirp {
      id: ID!
      text: String
      authorId: ID!
    }

    type Query {
      chirpById(id: ID!): Chirp
      chirpsByAuthorId(authorId: ID!): [Chirp]
    }
  `
});

addMockFunctionsToSchema({ schema: chirpSchema });

// create transform schema

const transformedChirpSchema = transformSchema(chirpSchema, [
  Transforms.FilterRootFields((operation: string, rootField: string) =>
    ['Query.chirpById'].includes(`${operation}.${rootField}`),
  ),
  Transforms.RenameTypes((name: string) => `Chirp_${name}`),
  Transforms.RenameRootFields((name: string) => `Chirp_${name}`),
]);
```

Now we have a schema that has all fields and types prefixed with `Chirp_` and has only `chirpById` root field. Now let's implement the resolvers like in previous example.

```js
mergeSchemas({
  schemas: [
    transformedChirpSchema,
    authorSchema,
    linkTypeDefs,
  ],
  resolvers: {
    User: {
      chirps: {
        fragment: `fragment UserFragment on User { id }`,
        resolve(parent, args, context, info) {
          const authorId = parent.id;
          return info.mergeInfo.delegateToSchema({
            schema: chirpSchema,
            operation: 'query',
            fieldName: 'chirpsByAuthorId',
            args: {
              authorId,
            },
            context,
            info,
            transforms: transformedChirpSchema.transforms,
          });
        },
      },
    },
    Chirp_Chirp: {
      author: {
        fragment: `fragment ChirpFragment on Chirp { authorId }`,
        resolve(parent, args, context, info) {
          const id = parent.authorId;
          return info.mergeInfo.delegateToSchema({
            schema: authorSchema,
            operation: 'query',
            fieldName: 'userById',
            args: {
              id,
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

We use `delegateToSchema` to be able to delegate to original schema. This way we can use `chirpsByAuthorId` field that has been filtered out of the transformed schema.

<h2 id="complex-example">Complex example</h2>

For a more complicated example involving properties and bookings, with implementations of all of the resolvers, check out the Launchpad links below:

* [Property schema](https://launchpad.graphql.com/v7l45qkw3)
* [Booking schema](https://launchpad.graphql.com/41p4j4309)
* [Merged schema](https://launchpad.graphql.com/q5kq9z15p)

<h2 id="api">API</h2>

<h3 id="mergeSchemas">mergeSchemas</h3>

```
mergeSchemas({
  schemas: Array<string | GraphQLSchema | Array<GraphQLNamedType>>;
  resolvers?: Array<IResolvers> | IResolvers;
  onTypeConflict?: (
    left: GraphQLNamedType,
    right: GraphQLNamedType,
    info?: {
      left: {
        schema?: GraphQLSchema;
      };
      right: {
        schema?: GraphQLSchema;
      };
    },
  ) => GraphQLNamedType;
})
```

This is the main function that implements schema stitching. Read below for a description of each option.

#### schemas

`schemas` is an array of schemas. Schemas can be `GraphQLSchema` objects, strings or list of GraphQL types. Strings can contain type extensions or GraphQL types, they will be added to resulting schema. Note that type extensions are always applied last, while types are used in order of schemas.

#### resolvers

`resolvers` accepts resolvers in same format as [makeExecutableSchema](./resolvers.html). It can also take an Array of resolvers. One addition to the resolver format is the possibility to specify a `fragment` for a resolver. `fragment` must be a GraphQL fragment definition, and allows you to specify which fields from the parent schema are required for the resolver to function correctly.

```js
resolvers: mergeInfo => ({
  Booking: {
    property: {
      fragment: 'fragment BookingFragment on Booking { propertyId }',
      resolve(parent, args, context, info) {
        return mergeInfo.delegateToSchema({
          schema: bookingSchema,
          operation: 'query',
          fieldName: 'propertyById',
          args: {
            id: parent.propertyId,
          },
          context,
          info,
        });
      },
    },
  },
})
```

#### mergeInfo and delegateToSchema

`mergeInfo` currently is an object with `delegateToSchema` property. It looks like this:

```js
type MergeInfo = {
  delegateToSchema<TContext>(options: IDelegateToSchemaOptions<TContext>): any;
}

interface IDelegateToSchemaOptions<TContext = {
    [key: string]: any;
}> {
    schema: GraphQLSchema;
    operation: Operation;
    fieldName: string;
    args?: {
        [key: string]: any;
    };
    context: TContext;
    info: GraphQLResolveInfo;
    transforms?: Array<Transform>;
}
```
`delegateToSchema` allows delegating to any GraphQLSchema, while adding `fragmentReplacement` transforms. It's identical to `delegateToSchema` function otherwise. See [Schema Delegation](./schema-delegation.html) and *Using with transforms* section of this documentation.


#### onTypeConflict

```js
type OnTypeConflict = (
  left: GraphQLNamedType,
  right: GraphQLNamedType,
  info?: {
    left: {
      schema?: GraphQLSchema;
    };
    right: {
      schema?: GraphQLSchema;
    };
  },
) => GraphQLNamedType;
```

`onTypeConflict` lets you customize type resolving logic. The default logic is to
take the first encountered type of all the types with the same name. This
method allows customization of this behavior, for example by taking another type or merging types together.

For example, taking types from last schemas, instead of first.

```js
const onTypeConflict = (left, right) => right;
```

Taking type from the schema that has higher field `version`.

```js
const onTypeConflict = (left, right, info) => {
  if (info.left.schema.version >= info.right.schema.version) {
    return left;
  } else {
    return right;
  }
}
```
