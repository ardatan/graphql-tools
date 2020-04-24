---
id: schema-transforms
title: Schema transforms
description: Automatically transforming schemas
---

Schema transforms are a tool for making modified copies of `GraphQLSchema` objects, without changing the original schema implementation. This is especially useful when the original schema _cannot_ be changed, i.e. when using [remote schemas](/docs/remote-schemas/).

Schema transforms can be useful when building GraphQL gateways that combine multiple schemas using [schema stitching](/docs/schema-stitching/) to combine schemas together without conflicts between types or fields.

Schema transforms work by wrapping the original schema in a new 'gateway' schema that simply delegates all operations to the original subschema. Each schema transform includes a function that changes the gateway schema. It may also include an operation transform, i.e. functions that either modify the operation prior to delegation or modify the result prior to its return.

```ts
interface Transform = {
  transformSchema?: (schema: GraphQLSchema) => GraphQLSchema;
  transformRequest?: (request: Request) => Request;
  transformResult?: (result: Result) => Result;
};
```

For example, let's consider changing the name of the type in a simple schema. Imagine we've written a function that takes a `GraphQLSchema` and replaces all instances of type `Test` with `NewTest`.

```graphql
# old schema
type Test {
  id: ID!
  name: String
}

type Query {
  returnTest: Test
}

# new schema

type NewTest {
  id: ID!
  name: String
}

type Query {
  returnTest: NewTest
}
```

On delegation to the original subschema, we want the `NewTest` type to be automatically mapped to the old `Test` type.

At first glance, it might seem as though most queries work the same way as before:

```graphql
query {
  returnTest {
    id
    name
  }
}
```

Since the fields of the type have not changed, delegating to the old schema is relatively easy here.

However, the new name begins to matter more when fragments and variables are used:

```graphql
query {
  returnTest {
    id
    ... on NewTest {
      name
    }
  }
}
```

Since the `NewTest` type did not exist on old schema, this fragment will not match anything in the old schema, so it will be filtered out during delegation.

What we need is a `transformRequest` function that knows how to rename any occurrences of `NewTest` to `Test` before delegating to the old schema.

By the same reasoning, we also need a `transformResult` function, because any results contain a `__typename` field whose value is `Test`, that name needs to be updated to `NewTest` in the final result.

## API

### Transform

```ts
interface Transform = {
  transformSchema?: (schema: GraphQLSchema) => GraphQLSchema;
  transformRequest?: (request: Request) => Request;
  transformResult?: (result: Result) => Result;
};

type Request = {
  document: DocumentNode;
  variables: Record<string, any>;
  extensions?: Record<string, any>;
};

type Result = ExecutionResult & {
  extensions?: Record<string, any>;
};
```

### wrapSchema

Given a `GraphQLSchema` and an array of `Transform` objects, produce a new schema with those transforms applied.

Delegating resolvers are generated to map from new schema root fields to old schema root fields. These automatic resolvers should be sufficient, so you don't have to implement your own.

The delegating resolvers will apply the operation transforms defined by the `Transform` objects. Each provided `transformRequest` functions will be applies in reverse order, until the request matches the original schema. The `tranformResult` functions will be applied in the opposite order until the result matches the final gateway schema.

### transformSchema

For convenience, when using `transformSchema`, after schema transformation, the `transforms` property on a returned `transformedSchema` object will contains the operation transforms that were applied. This could be useful when manually delegating to the transformed schema, but has been deprecated in favor of specifying the transforms within a subschema configuration object. See the [schema stitching](/docs/schema-stitching/) docs for further details.

## Built-in transforms

Built-in transforms are ready-made classes implementing the `Transform` interface. They are intended to cover many of the most common schema transformation use cases, but they also serve as examples of how to implement transforms for your own needs.

### Modifying types

* `FilterTypes(filter: (type: GraphQLNamedType) => boolean)`: Remove all types for which the `filter` function returns `false`.

* `RenameTypes(renamer, options?)`: Rename types by applying `renamer` to each type name. If `renamer` returns `undefined`, the name will be left unchanged. Options controls whether built-in types and scalars are renamed. Root objects are never renamed by this transform.

```ts
RenameTypes(
  (name: string) => string | void,
  options?: {
    renameBuiltins: Boolean;
    renameScalars: Boolean;
  },
)
```

### Modifying root fields

* `TransformRootFields(transformer: RootTransformer)`: Given a transformer, arbitrarily transform root fields. The `transformer` can return a `GraphQLFieldConfig` definition, a object with new `name` and a `field`, `null` to remove the field, or `undefined` to leave the field unchanged.

```ts
TransformRootFields(transformer: RootTransformer)

type RootTransformer = (
  operation: 'Query' | 'Mutation' | 'Subscription',
  fieldName: string,
  field: GraphQLField<any, any>,
) =>
  | GraphQLFieldConfig<any, any>
  | { name: string; field: GraphQLFieldConfig<any, any> }
  | null
  | void;
```

* `FilterRootFields(filter: RootFilter)`: Like `FilterTypes`, removes root fields for which the `filter` function returns `false`.

```ts
FilterRootFields(filter: RootFilter)

type RootFilter = (
  operation: 'Query' | 'Mutation' | 'Subscription',
  fieldName: string,
  field: GraphQLField<any, any>,
) => boolean;
```

* `RenameRootFields(renamer)`: Rename root fields, by applying the `renamer` function to their names.

```ts
RenameRootFields(
  renamer: (
    operation: 'Query' | 'Mutation' | 'Subscription',
    name: string,
    field: GraphQLField<any, any>,
  ) => string,
)
```

### Modifying object fields

* `TransformObjectFields(objectFieldTransformer: ObjectFieldTransformer, fieldNodeTransformer?: FieldNodeTransformer))`: Given an object field transformer, arbitrarily transform fields. The `objectFieldTransformer` can return a `GraphQLFieldConfig` definition, a object with new `name` and a `field`, `null` to remove the field, or `undefined` to leave the field unchanged. The optional `fieldNodeTransformer`, if specified, is called upon any field of that type in the request; result transformation can be specified by wrapping the field's resolver within the `objectFieldTransformer`. In this way, a field can be fully arbitrarily modified in place.

```ts
TransformObjectFields(objectFieldTransformer: ObjectFieldTransformer, fieldNodeTransformer: FieldNodeTransformer)

type ObjectFieldTransformer = (
  typeName: string,
  fieldName: string,
  field: GraphQLField<any, any>,
) =>
  | GraphQLFieldConfig<any, any>
  | { name: string; field: GraphQLFieldConfig<any, any> }
  | null
  | void;

type FieldNodeTransformer = (
  typeName: string,
  fieldName: string,
  fieldNode: FieldNode
) => FieldNode;
```

* `FilterObjectFields(filter: ObjectFilter)`: Removes object fields for which the `filter` function returns `false`.

```ts
FilterObjectFields(filter: ObjectFilter)

type ObjectFilter = (
  typeName: string,
  fieldName: string,
  field: GraphQLField<any, any>,
) => boolean;
```

* `RenameObjectFields(renamer)`: Rename object fields, by applying the `renamer` function to their names.

```ts
RenameObjectFields(
  renamer: (
    typeName: string,
    fieldName: string,
    field: GraphQLField<any, any>,
  ) => string,
)
```

### Additional Operation Transforms

It may be sometimes useful to add additional transforms to manually change an operation request or result when using `delegateToSchema`. Common use cases may be move selections around or to wrap them. The following built-in transforms may be useful in those cases.

* `ExtractField({ from: Array<string>, to: Array<string> })` - move selection at `from` path to `to` path.

* `WrapQuery(
    path: Array<string>,
    wrapper: QueryWrapper,
    extractor: (result: any) => any,
  )` - wrap a selection at `path` using function `wrapper`. Apply `extractor` at the same path to get the result. This is used to get a result nested inside other result

```js
transforms: [
  // Wrap document takes a subtree as an AST node
  new WrapQuery(
    // path at which to apply wrapping and extracting
    ['userById'],
    (subtree: SelectionSetNode) => ({
      // we create a wrapping AST Field
      kind: Kind.FIELD,
      name: {
        kind: Kind.NAME,
        // that field is `address`
        value: 'address',
      },
      // Inside the field selection
      selectionSet: subtree,
    }),
    // how to process the data result at path
    result => result && result.address,
  ),
],
```

`WrapQuery` can also be used to expand multiple top level query fields

```js
transforms: [
  // Wrap document takes a subtree as an AST node
  new WrapQuery(
    // path at which to apply wrapping and extracting
    ['userById'],
    (subtree: SelectionSetNode) => {
      const newSelectionSet = {
        kind: Kind.SELECTION_SET,
        selections: subtree.selections.map(selection => {
          // just append fragments, not interesting for this
          // test
          if (selection.kind === Kind.INLINE_FRAGMENT ||
            selection.kind === Kind.FRAGMENT_SPREAD) {
            return selection;
          }
          // prepend `address` to name and camelCase
          const oldFieldName = selection.name.value;
          return {
            kind: Kind.FIELD,
            name: {
              kind: Kind.NAME,
              value: 'address' +
                oldFieldName.charAt(0).toUpperCase() +
                oldFieldName.slice(1)
            }
          };
        })
      };
      return newSelectionSet;
    },
    // how to process the data result at path
    result => ({
      streetAddress: result.addressStreetAddress,
      zip: result.addressZip
    })
```

## delegateToSchema (delegation) transforms

The following transforms are automatically applied by `delegateToSchema` during schema delegation, to translate between source and target types and fields:

* `ExpandAbstractTypes`: If an abstract type within a document does not exist within the target schema, expand the type to each and any of its implementations that do exist.
* `FilterToSchema`: Remove all fields, variables and fragments for types that don't exist within the target schema.
* `AddTypenameToAbstract`: Add `__typename` to all abstract types in the document, necessary for type resolution of interfaces within the source schema to work.
* `CheckResultAndHandleErrors`: Given a result from a subschema, propagate errors so that they match the correct subfield. Also provide the correct key if aliases are used.

By passing a custom `transforms` array to `delegateToSchema`, it's possible to run additional operation (request/result) transforms before these default transforms.

## stitchSchemas (gateway/stitching) transforms

* `AddReplacementSelectionSets(schema: GraphQLSchema, mapping: ReplacementSelectionSetMapping)`:  `stitchSchemas` adds selection sets on outgoing requests from the gateway, enabling delegation from fields specified on the gateway using fields obtained from the original requests. The selection sets can be added depending on the presence of fields within the request using the `selectionSet` option within the resolver map.  `stitchSchemas` creates the mapping at gateway startup. Selection sets are used instead of fragments as the selections are added prior to transformation (in case type names are changed).
* `AddMergedTypeSelectionSets(schema: GraphQLSchema, mapping: Record<string, MergedTypeInfo>)`: `stitchSchemas` adds selection sets on outgoing requests from the gateway, enabling type merging from the initial result using any fields initially obtained. The mapping is created at gateway startup.
* Deprecated: `ReplaceFieldWithFragment(targetSchema: GraphQLSchema, fragments: Array<{ field: string; fragment: string; }>)`: Replace the given fields with an inline fragment. Used by original `stitchSchemas` to add prespecified fragments to root fields, enabling delegation `fragment` option. Array was parsed at each delegation.
