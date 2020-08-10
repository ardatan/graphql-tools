---
id: stitch-merging-types
title: Merging types
sidebar_label: Merging types
---

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
  resolve?: MergedTypeResolver;
  fieldName?: string;
  args?: (originalResult: any) => Record<string, any>;
  key?: (originalResult: any) => K;
  argsFromKeys?: (keys: ReadonlyArray<K>) => Record<string, any>;
  valuesFromResults?: (results: any, keys: ReadonlyArray<K>) => Array<V>;
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

You can also use batch delegation instead of simple delegation by delegating to a root field returning a list and using the `key`, `argsFromKeys`, and `valuesFromResults` properties. See the [batch delegation](#batch-delegation) for more details.

The simplified magic above happens because if left unspecified, we provide a default type-merging resolver for you, which uses the other `MergedTypeConfig` options (for simple delegation), as follows:

```js
mergedTypeConfig.resolve = (originalResult, context, info, schemaOrSubschemaConfig, selectionSet) =>
  delegateToSchema({
    schema: schemaOrSubschemaConfig,
    operation: 'query',
    fieldName: mergedTypeConfig.fieldName,
    returnType: getNamedType(info.returnType),
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
