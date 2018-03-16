---
title: Schema transforms
description: Automatically transforming schemas
---

Schema transforms are abstractions that let you specify transformations to the schema in a generic way, while keeping an ability to delegate back to original schema. It's useful when working with remote schemas, when building GraphQL gateways and using schema stitching.

While it's possible to change the schema and modify resolvers to accomodate the changes, for many things that would require lots of extra work. Transforms allow definining a generic set of functions that handle for yourself. They can be reused between schemas and applications.

Transform is a set of at least one of three *transformers* - a schema transformer, a request transformer and result transformer. Schema transformer takes a schema and returns a schema, request transformer modifies GraphQL Document and variables, while result transformer modifies the request.

While schema delegation can in many cases accomodate to changes in schema, especially the changes that add or remove types or fields to the schema, changes that require mapping new types or fields to old types require additional transforms. For example, let's consider changing the name of the type in a very simple schema. Let's imagine we've defined a function that takes a GraphQLSchema and replaces all instances of type `Test` with `NewTest`.

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

We want `NewTest` to be automatically mappped to old typed name `Test`. From the first glance, it should actually work fine:

```
query {
  returnTest {
    id
    name
  }
}
```

As contents of the types didn't change, this can easily be delegate to old schema without any changes. However things change, when Fragments and variables come into play.

```
query {
  returnTest }
    id
    ... on NewTest {
      name
    }
  }
}
```

Type `NewTest` doesn't exist on old schema, thus it will be filtered out by delegation. Here a request transform comes into play, where we can define that we want to rename all times we encounter `NewTest` type name to name `Test` in old schema.

Lastly, we need a result transform. This only comes into play if we request `__typename` from the schema, and here we again need to map from `Test` to `NewTest`.

<h2 id="api">API</h2>

<h3 id="mergeSchemas">mergeSchemas</h3>

```js
type Transform = {
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

<h3 id="makeTransformSchema">makeTransformSchema</h3>

Given a `GraphQLSchema` and an array of `Transform`, produce a new schema transformed by them. Also creates delegating resolvers mapping from new schema root fields to old schema root fields. Most of the time, when using transforms, you would be using this.

<h3 id="visitSchema">visitSchema</h3>

```js
enum VisitSchemaKind {
  TYPE = 'VisitSchemaKind.TYPE',
  SCALAR_TYPE = 'VisitSchemaKind.SCALAR_TYPE',
  ENUM_TYPE = 'VisitSchemaKind.ENUM_TYPE',
  COMPOSITE_TYPE = 'VisitSchemaKind.COMPOSITE_TYPE',
  OBJECT_TYPE = 'VisitSchemaKind.OBJECT_TYPE',
  INPUT_OBJECT_TYPE = 'VisitSchemaKind.INPUT_OBJECT_TYPE',
  ABSTRACT_TYPE = 'VisitSchemaKind.ABSTRACT_TYPE',
  UNION_TYPE = 'VisitSchemaKind.UNION_TYPE',
  INTERFACE_TYPE = 'VisitSchemaKind.INTERFACE_TYPE',
  ROOT_OBJECT = 'VisitSchemaKind.ROOT_OBJECT',
  QUERY = 'VisitSchemaKind.QUERY',
  MUTATION = 'VisitSchemaKind.MUTATION',
  SUBSCRIPTION = 'VisitSchemaKind.SUBSCRIPTION',
}

type SchemaVisitor = { [key: VisitSchemaKind]: TypeVisitor };
type TypeVisitor = (
  type: GraphQLType,
  schema: GraphQLSchema,
) => GraphQLNamedType;

function visitSchema(
  schema: GraphQLSchema,
  visitor: SchemaVisitor,
  stripResolvers?: Boolean,
) => GraphQLSchema;
```

A helper function to modify schema, modelled after `visit` function in `graphql-js`. It's often convinient to use this (together with `visit/visitWithTypeInfo` and `visitObject`) to create transforms. Accepts visitor, where keys are the kind of types one want to visit. More specific kinds override less specific ones (so `SUBSCRIPTION`, if present, would be called instead of `ROOT_OBJECT` or `INTERFACE_TYPE`). If `stripResolvers` is passed, all field resolvers would be removed from the schema. When writing transforms, you usually don't need to do that. Example that changes name of all types, but root.

```js
visitSchema(schema, {
  [VisitSchemaKind.TYPE](
    type: GraphQLNamedType,
  ): GraphQLNamedType | undefined {
    const newName = `Foo_${type.name}`;
    if (newName && newName !== type.name) {
      const newType = Object.assign(Object.create(type), type);
      newType.name = newName;
      return newType;
    }
  },

  [VisitSchemaKind.ROOT_OBJECT](type: GraphQLNamedType) {
    return undefined;
  },
});
```

<h3 id="visitObject">visitObject</h3>

```js
type ObjectVisitor = (
  key: string,
  value: any,
  parents: Array<string>,
) => any | undefined | null;

visitObject(object: any, visitor: ObjectVisitor) => any
```

A helper function to do a depth-first traversal of a nested object, such as `data` of GraphQL `ExecutionResult`. If `visitor` returns `undefined`, the branch is kept intact. On `null` branch is removed. Any other results make the branch be replaced with it. Note that `visitObject` will visit a replaced result too.

<h2 id="built-in">Built-in transforms</h2>

Built-in transforms are all functions returning a `Transform`.

### Modifying types

* `FilterTypes(filter: (type: GraphQLNamedType) => boolean)` - remove all types for which `filter` returns false
* `RenameTypes(renamer, options?)` - rename types by applying `renamer` to each type name. If it returns `undefined`, name isn't changed. Options controls whether built-in types and scalars are renamed. Root objects aren't renamed by this transform

```js
RenameTypes(
  (name: string) => string | undefined,
  options?: {
    renameBuiltins: Boolean,
    renameScalars: Boolean
  }
)
```

### Modifying root fields

* `TransformRootFields(transformer: RootTransformer)` - given a transformer, abritrarily transform root fields. Transformer can return a `GraphQLFieldConfig` definition, a object with new `name` and a `field`, a null to remove the field or undefined to do nothing.

```js
TransformRootFields(transformer: RootTransformer)

type RootTransformer = (
  operation: 'Query' | 'Mutation' | 'Subscription',
  fieldName: string,
  field: GraphQLField<any, any>,
) =>
  | GraphQLFieldConfig<any, any>
  | { name: string; field: GraphQLFieldConfig<any, any> }
  | null
  | undefined;
```

* `FilterRootFields(filter: RootFilter)` - filter out root fields, for which filter returns false.

```js
FilterRootFields(filter: RootFilter)

type RootFilter = (
  operation: 'Query' | 'Mutation' | 'Subscription',
  fieldName: string,
  field: GraphQLField<any, any>,
) => Boolean;

```

* `RenameRootFields(renamer)` - rename root fields, by applying `renamer` to their names.

```js
function RenameRootFields(
  renamer: (
    operation: 'Query' | 'Mutation' | 'Subscription',
    name: string,
    field: GraphQLField<any, any>,
  ) => string,
)
```

### Other

* `ReplaceFieldWithFragment(targetSchema: GraphQLSchema, mapping: FieldToFragmentMapping)` - replace fields in types defined in mapping by an inline fragment. Used by `mergeSchemas` to resolve `fragment` option.

```js
type FieldToFragmentMapping = {
  [typeName: string]: { [fieldName: string]: InlineFragmentNode };
};
```

<h2 id="other-built-in">delegateToSchema transforms</h2>

Those transforms are automatically added to transform list by `delegateToSchema`. Useful if you want to build an alternative `delegateToSchema` implementation.

* `AddArgumentsAsVariables` - given a schema and arguments to root field passed, make those arguments document variables
* `AddTypenameToAbstract` - add `__typename` to all abstract types in the document
* `FilterToSchema` - given a schema and document, remove all fields, variables and fragments for the types that don't exist in that schema
* `CheckResultAndHandleErrors` - given a result from a subschema, propagate errors so that they match correct subfield. Also provide correct key if the aliases are used.
