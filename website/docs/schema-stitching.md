---
id: schema-stitching
title: Schema stitching
description: Combining multiple GraphQL APIs into one
---

Schema stitching is the process of creating a single GraphQL schema from multiple underlying GraphQL APIs.

One of the main benefits of GraphQL is that we can query all of our data as part of one schema, and get everything we need in one request. But as the schema grows, it might become cumbersome to manage it all as one codebase, and it starts to make sense to split it into different modules. We may also want to decompose your schema into separate microservices, which can be developed and deployed independently. We may also want to integrate our own schema with remote schemas.

In these cases, we use `stitchSchemas` to combine multiple GraphQL schemas together and produce a new schema that knows how to delegate parts of the query to the relevant subschemas. These subschemas can be either local to the server, or running on a remote server. They can even be services offered by 3rd parties, allowing us to connect to external data and create mashups.

## Basic example

In this example we'll stitch together two very simple schemas. In this case, we're dealing with two schemas that implement a system with users and "chirps"&mdash;small snippets of text that users can post.

```js
import { makeExecutableSchema } from '@graphql-tools/schema';
import { addMocksToSchema } from '@graphql-tools/mock';
import { stitchSchemas } from '@graphql-tools/stitch';

// Mocked chirp schema
// We don't worry about the schema implementation right now since we're just
// demonstrating schema stitching.
let chirpSchema = makeExecutableSchema({
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

chirpSchema = addMocksToSchema({ schema: chirpSchema });

// Mocked author schema
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

authorSchema = addMocksToSchema({ schema: authorSchema });

export const schema = stitchSchemas({
  subschemas: [
    { schema: chirpSchema, },
    { schema: authorSchema, },
  ],
});
```

Note the new `subschemas` property with an array of subschema configuration objects. This syntax is a bit more verbose, but we shall see how it provides multiple benefits:
1. transforms should be specified on the subschema config object, avoiding creation of a new schema with a new round of delegation in order to transform a schema prior to merging. This also makes it simple to include the necessary transforms when delegating, as you will pass the entire subschema configuration object to `delegateToSchema` instead of just the schema, with the required transforms included for free.
2. remote subschema configuration options can be specified, also avoiding an additional round of schema proxying. That's three rounds of delegations reduce to one!

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

## Using with Transforms

Often, when creating a GraphQL gateway that combines multiple existing schemas, we might want to modify one of the schemas. The most common tasks include renaming some of the types, and filtering the root fields. By using [transforms](/docs/schema-transforms/) with schema stitching, we can easily tweak the subschemas before merging them together. (In earlier versions of graphql-tools, this required an additional round of delegation prior to merging, but transforms can now be specifying directly when merging using the new subschema configuration objects.)

For example, suppose we transform the `chirpSchema` by removing the `chirpsByAuthorId` field and add a `Chirp_` prefix to all types and field names, in order to make it very clear which types and fields came from `chirpSchema`:

```ts
import { makeExecutableSchema } from '@graphql-tools/schema';
import { addMocksToSchema } from '@graphql-tools/mock';
import { stitchSchemas } from '@graphql-tools/stitch';
import {
  FilterRootFields,
  RenameTypes,
  RenameRootFields,
} from '@graphql-tools/wrap';

// Mocked chirp schema; we don't want to worry about the schema
// implementation right now since we're just demonstrating
// schema stitching
let chirpSchema = makeExecutableSchema({
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

chirpSchema = addMocksToSchema({ schema: chirpSchema });

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

## Merging types

We are still stuck exposing the `authorId` field within the `Chirp` type even though we actually just want to include an `author`. We can always use transforms to filter out the `authorId` field, but it would be nice if this could be made more ergonomical. It also makes stitching somewhat more difficult when the authorId is not directly exposed -- for example, in a situation where we do not control the remote subschema in question.

What is the chirps subschema also had its own self-contained user concept, and we just wanted to combine the relevant fields from both subschemas?

```js
let chirpSchema = makeExecutableSchema({
  typeDefs: `
    type Chirp {
      id: ID!
      text: String
      author: User
    }

    type User {
      id: ID!
      chirps: [Chirp]
    }

    type Query {
      chirpById(id: ID!): Chirp
      chirpsByUserId(id: ID!): [Chirp]
      userById(id: ID!): User
    }
  `
});

chirpSchema = addMocksToSchema({ schema: chirpSchema });

// Mocked author schema
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

authorSchema = addMocksToSchema({ schema: authorSchema });
```

This can now be accomplished by turning on type merging!

```js
const stitchedSchema = stitchSchemas({
  subschemas: [
    {
      schema: chirpSchema,
      merge: {
        User: {
          fieldName: 'userById',
          args: (originalResult) => ({ id: originalResult.id }),
          selectionSet: '{ id }',
        },
      },
    },
    {
      schema: authorSchema,
      merge: {
        User: {
          fieldName: 'userById',
          args: (originalResult) => ({ id: originalResult.id }),
          selectionSet: '{ id }',
        },
      },
    },
  ],
  mergeTypes: true,
});
```

The `merge` property on the `SubschemaConfig` object determines how types are merged, and is a map of `MergedTypeConfig` objects:

```ts
export interface MergedTypeConfig {
  selectionSet?: string;
  fieldName?: string;
  args?: (originalResult: any) => Record<string, any>;
  resolve?: MergedTypeResolver;
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

The simplified magic above happens because if left unspecified, we provide a default type-merging resolver for you, which uses the other `MergedTypeConfig` options, as follows:

```ts
mergedTypeConfig.resolve = (originalResult, context, info, schemaOrSubschemaConfig, selectionSet) =>
  delegateToSchema({
    schema: schemaOrSubschemaConfig,
    operation: 'query',
    fieldName: mergedTypeConfig.fieldName,
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

## Working with remote schemas

In order to merge with a remote schema, we specify different options within the subschema configuration object that describe how to connect to the remote schema. For example:

```ts
  subschemas: [
    {
      schema: nonExecutableChirpSchema,
      executor: chirpSchemaExecutor,
      transforms: chirpSchemaTransforms,
    },
    { schema: authorSchema },
  ],
```

The remote schema may be obtained either via introspection or any other source. An executor is a generic method of connecting to a schema.

Specifying the remote schema options within the `stitchSchemas` call itself allows for skipping an additional round of delegation. The old method of using [makeRemoteExecutableSchema](/docs/remote-schemas/) to create a local proxy for the remote schema would still work, and the same arguments are supported. See the [remote schema](/docs/remote-schemas/) docs for further description of the options available. Subschema configuration allows for specifying an executor method for query and mutation operations, and a subscriber function for subscription operations.

## API

```ts
export type SubschemaConfig = {
  schema: GraphQLSchema;
  rootValue?: Record<string, any>;
  executor?: Executor;
  subscriber?: Subscriber;
  transforms?: Array<Transform>;
};

export type SchemaLikeObject =
  SubschemaConfig |
  GraphQLSchema |
  string |
  DocumentNode |
  Array<GraphQLNamedType>;

stitchSchemas({
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
})
```

This is the main function that implements schema stitching. Note that in addition to the above arguments, the function also takes all the same arguments as [`makeExecutableSchema`](/docs/generate-schema/). Read below for a description of each option.

### subschemas

`subschemas` is an array of `GraphQLSchema` or `SubschemaConfig` objects. These subschemas are wrapped with proxying resolvers in the final schema.

### types

Additional types to add to the final type map, most useful for custom scalars or enums.

### typeDefs

Strings or parsed documents that can contain additional types or type extensions. Note that type extensions are always applied last, while types are defined in the order in which they are provided.

### resolvers

`resolvers` accepts resolvers in same format as [makeExecutableSchema](/docs/resolvers/). It can also take an Array of resolvers. One addition to the resolver format is the possibility to specify a `selectionSet` for a resolver. The `selectionSet` must be a GraphQL selection set definition string, specifying which fields from the parent schema are required for the resolver to function properly.

```js
resolvers: {
  Booking: {
    property: {
      selectionSet: '{ propertyId }',
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

### delegateToSchema

The `delegateToSchema` method:

```js
delegateToSchema<TContext>(options: IDelegateToSchemaOptions<TContext>): any;

interface IDelegateToSchemaOptions<TContext = Record<string, any>> {
    schemaOrSchemaConfig: GraphQLSchema | SubschemaConfig;
    operation: Operation;
    fieldName: string;
    args?: Record<string, any>;
    context: TContext;
    info: GraphQLResolveInfo;
    transforms?: Array<Transform>;
}
```

As described in the documentation above, `delegateToSchema` allows delegating to any `GraphQLSchema` or `SubschemaConfig` object. Transforms do not have to be re-specified when passing a `SubschemaConfig` object, which is the preserved workflow. Additional transforms can also be passed as needed. See [Schema Delegation](/docs/schema-delegation/) and the [*Using with transforms*](#using-with-transforms) section of this document.

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

The `onTypeConflict` option to `stitchSchemas` allows customization of type resolving logic.

The default behavior of `stitchSchemas` is to take the *last* encountered type of all the types with the same name, with a warning that type conflicts have been encountered. If specified, `onTypeConflict` enables explicit selection of the winning type.

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

When using schema transforms, `onTypeConflict` is often unnecessary, since transforms can be used to prevent conflicts before merging schemas. However, if you're not using schema transforms, `onTypeConflict` can be a quick way to make `stitchSchemas` produce more desirable results.

#### inheritResolversFromInterfaces

The `inheritResolversFromInterfaces` option is simply passed through to `addResolversToSchema`, which is called when adding resolvers to the schema under the covers. See [`addResolversToSchema`](/docs/resolvers/#addresolverstoschema-schema-resolvers-resolvervalidationoptions-inheritresolversfrominterfaces-) for more info.
