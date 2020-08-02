---
id: stitch-api
title: Stitching API
description: Stitching API
---

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
