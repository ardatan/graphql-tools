---
title: Schema stitching (still going strong)
description: Combining multiple GraphQL APIs into one
---

> **Deprecated:** Federation is our replacement for schema stitching that enables developers to declaratively compose a distributed graph. Learn why in our [blog post](https://blog.apollographql.com/apollo-federation-f260cf525d21) and [how to migrate](https://www.apollographql.com/docs/apollo-server/federation/migrating-from-stitching/) in the federation guide.

Schema stitching is the process of creating a single GraphQL schema from multiple underlying GraphQL APIs.

One of the main benefits of GraphQL is that we can query all of our data as part of one schema, and get everything we need in one request. But as the schema grows, it might become cumbersome to manage it all as one codebase, and it starts to make sense to split it into different modules. We may also want to decompose your schema into separate microservices, which can be developed and deployed independently. We may also want to integrate our own schema with remote schemas.

In these cases, we use `mergeSchemas` to combine multiple GraphQL schemas together and produce a new schema that knows how to delegate parts of the query to the relevant subschemas. These subschemas can be either local to the server, or running on a remote server. They can even be services offered by 3rd parties, allowing us to connect to external data and create mashups.

## Basic example

In this example we'll stitch together two very simple schemas. In this case, we're dealing with two schemas that implement a system with users and "chirps"&mdash;small snippets of text that users can post.

```js
import {
  makeExecutableSchema,
  addMockFunctionsToSchema,
  mergeSchemas,
} from 'graphql-tools';

// Mocked chirp schema
// We don't worry about the schema implementation right now since we're just
// demonstrating schema stitching.
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

addMockFunctionsToSchema({ schema: authorSchema });

export const schema = mergeSchemas({
  subschemas: [
    { schema: chirpSchema, },
    { schema: authorSchema, },
  ],
});
```

Note the new `subschemas` property with an array of subschema configuration objects. This syntax is a bit more verbose, but we shall see how it provides multiple benefits:
1. transforms can be specified on the subschema config object, avoiding creation of a new schema with a new round of delegation in order to transform a schema prior to merging.
2. remote schema configuration options can be specified, also avoiding an additional round of schema proxying.

This gives us a new schema with the root fields on `Query` from both schemas (along with the `User` and `Chirp` types):

```graphql
type Query {
  chirpById(id: ID!): Chirp
  chirpsByAuthorId(authorId: ID!): [Chirp]
  userById(id: ID!): User
}
```

We now have a single schema that supports asking for `userById` and `chirpsByAuthorId` in the same query!

### Adding resolvers between schemas

Combining existing root fields is a great start, but in practice we will often want to introduce additional fields for working with the relationships between types that came from different subschemas. For example, we might want to go from a particular user to their chirps, or from a chirp to its author. Or we might want to query a `latestChirps` field and then get the author of each of those chirps. If the only way to obtain a chirp's author is to call the `userById(id)` root query field with the `authorId` of a given chirp, and we don't know the chirp's `authorId` until we receive the GraphQL response, then we won't be able to obtain the authors as part of the same query.

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
export const schema = mergeSchemas({
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

Resolvers can use the `delegateToSchema` function to forward parts of queries (or even whole new queries) to one of the subschemas that was passed to `mergeSchemas` (or any other schema).

In order to delegate to these root fields, we'll need to make sure we've actually requested the `id` of the user or the `authorId` of the chirp. To avoid forcing users to add these fields to their queries manually, resolvers on a merged schema can define a `fragment` property that specifies the required fields, and they will be added to the query automatically.

A complete implementation of schema stitching for these schemas might look like this:

```js
const schema = mergeSchemas({
  subschemas: [
    { schema: chirpSchema, },
    { schema: authorSchema, },
  ],
  typeDefs: linkTypeDefs,
  resolvers: {
    User: {
      chirps: {
        fragment: `... on User { id }`,
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
        fragment: `... on Chirp { authorId }`,
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

## Using with Transforms

Often, when creating a GraphQL gateway that combines multiple existing schemas, we might want to modify one of the schemas. The most common tasks include renaming some of the types, and filtering the root fields. By using [transforms](/schema-transforms/) with schema stitching, we can easily tweak the subschemas before merging them together. (In earlier versions of graphql-tools, this required an additional round of delegation prior to merging, but transforms can now be specifying directly when merging using the new subschema configuration objects.)

For example, suppose we transform the `chirpSchema` by removing the `chirpsByAuthorId` field and add a `Chirp_` prefix to all types and field names, in order to make it very clear which types and fields came from `chirpSchema`:

```ts
import {
  makeExecutableSchema,
  addMockFunctionsToSchema,
  mergeSchemas,
  FilterRootFields,
  RenameTypes,
  RenameRootFields,
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

// create transforms

const chirpSchemaTransforms = [
  new FilterRootFields(
    (operation: string, rootField: string) => rootField !== 'chirpsByAuthorId'
  ),
  new RenameTypes((name: string) => `Chirp_${name}`),
  new RenameRootFields((operation: 'Query' | 'Mutation' | 'Subscription', name: string) => `Chirp_${name}`),
];
```

We will now have a schema that has all fields and types prefixed with `Chirp_` and has only the `chirpById` root field.

Now let's implement the resolvers:

```ts
const chirpSubschema = {
  schema: chirpSchema,
  transforms: chirpSchemaTransforms,
}

export const schema = mergeSchemas({
  subschemas: [
    chirpSubschema,
    { schema: authorSchema },
  ],
  typeDefs: linkTypeDefs,

  resolvers: {
    User: {
      chirps: {
        fragment: `... on User { id }`,
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
        fragment: `... on Chirp { authorId }`,
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

Notice that `resolvers.Chirp_Chirp` has been renamed from just `Chirp`, but `resolvers.Chirp_Chirp.author.fragment` still refers to the original `Chirp` type and `authorId` field, rather than `Chirp_Chirp` and `Chirp_authorId`.

Also, when we call `delegateToSchema` in the `User.chirps` resolvers, we can delegate to the original `chirpsByAuthorId` field, even though it has been filtered out of the final schema.

## Working with remote schemas

In order to merge with a remote schema, we specify different options within the subschema configuration object that describe how to connect to the remote schema. For example:

```ts
  subschemas: [
    {
      schema: nonExecutableChirpSchema,
      link: chirpSchemaLink
      transforms: chirpSchemaTransforms,
    },
    { schema: authorSchema },
  ],
```

The remote schema may be obtained either via introspection or any other source. A link is a generic ApolloLink method of connecting to a schema, also used by Apollo Client.

Specifying the remote schema options within the `mergeSchemas` call itself allows for skipping an additional round of delegation. The old method of using [makeRemoteExecutableSchema](/remote-schemas/) to create a local proxy for the remote schema would still work, and the same arguments are supported. See the [remote schema](/remote-schemas/) docs for further description of the options available. Subschema configuration allows for specifying an ApolloLink `link`, any fetcher method (if not using subscriptions), or a dispatcher function that takes the graphql `context` object as an argument and dynamically returns a link object or fetcher method.

## API

### schemas

```ts

export type SubschemaConfig = {
  schema: GraphQLSchema;
  rootValue?: Record<string, any>;
  executor?: Delegator;
  subscriber?: Delegator;
  link?: ApolloLink;
  fetcher?: Fetcher;
  dispatcher?: Dispatcher;
  transforms?: Array<Transform>;
};

export type SchemaLikeObject =
  SubschemaConfig |
  GraphQLSchema |
  string |
  DocumentNode |
  Array<GraphQLNamedType>;

mergeSchemas({
  subschemas: Array<SubschemaConfig>;
  types: Array<GraphQLNamedType>;
  typeDefs: string | DocumentNode;
  schemas: Array<SchemaLikeObject>;
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
  inheritResolversFromInterfaces?: boolean;
  schemaDirectives?: { [name: string]: typeof SchemaDirectiveVisitor };
})
```

This is the main function that implements schema stitching. Read below for a description of each option.

#### schemas

`schemas` is an array of `GraphQLSchema` objects, schema strings, or lists of `GraphQLNamedType`s. Strings can contain type extensions or GraphQL types, which will be added to resulting schema. Note that type extensions are always applied last, while types are defined in the order in which they are provided. Using the `subschemas` and `typeDefs` parameters is preferred, as these parameter names better describe whether the includes types will be wrapped or will be imported directly into the outer schema.

#### resolvers

`resolvers` accepts resolvers in same format as [makeExecutableSchema](/resolvers/). It can also take an Array of resolvers. One addition to the resolver format is the possibility to specify a `fragment` for a resolver. The `fragment` must be a GraphQL fragment definition string, specifying which fields from the parent schema are required for the resolver to function properly.

```js
resolvers: {
  Booking: {
    property: {
      fragment: '... on Booking { propertyId }',
      resolve(parent, args, context, info) {
        return delegateToSchema({
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
}
```

#### delegateToSchema

The `delegateToSchema` method:

```js
delegateToSchema<TContext>(options: IDelegateToSchemaOptions<TContext>): any;

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

As described in the documentation above, `delegateToSchema` allows delegating to any `GraphQLSchema` object, optionally applying transforms in the process. See [Schema Delegation](/schema-delegation/) and the [*Using with transforms*](#using-with-transforms) section of this document.

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

The `onTypeConflict` option to `mergeSchemas` allows customization of type resolving logic.

The default behavior of `mergeSchemas` is to take the *last* encountered type of all the types with the same name, with a warning that type conflicts have been encountered. If specified, `onTypeConflict` enables explicit selection of the winning type.

For example, here's how we could select the *first* type among multiple types with the same name:

```js
const onTypeConflict = (left, right) => left;
```

And here's how we might select the type whose schema has the latest `version`:

```js
const onTypeConflict = (left, right, info) => {
  if (info.left.schema.version >= info.right.schema.version) {
    return left;
  } else {
    return right;
  }
}
```

When using schema transforms, `onTypeConflict` is often unnecessary, since transforms can be used to prevent conflicts before merging schemas. However, if you're not using schema transforms, `onTypeConflict` can be a quick way to make `mergeSchemas` produce more desirable results.

#### inheritResolversFromInterfaces

The `inheritResolversFromInterfaces` option is simply passed through to `addResolversToSchema`, which is called when adding resolvers to the schema under the covers. See [`addResolversToSchema`](/resolvers/#addresolvefunctionstoschema-schema-resolvers-resolvervalidationoptions-inheritresolversfrominterfaces-) for more info.
