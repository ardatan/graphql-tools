---
title: "GraphQLResolveInfo"
description: "The GraphQLResolveInfo interface exported by @graphql-tools/utils."
---

Defined in: [packages/utils/src/Interfaces.ts:71](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L71)

## Extends

- `GraphQLResolveInfo`

## Properties

### fieldName

> `readonly` **fieldName**: `string`

Defined in: node\_modules/graphql/type/definition.d.mts:2176

The field name referenced by this schema coordinate.

#### Inherited from

`OrigGraphQLResolveInfo.fieldName`

***

### fieldNodes

> `readonly` **fieldNodes**: readonly `FieldNode`[]

Defined in: node\_modules/graphql/type/definition.d.mts:2178

AST field nodes that contributed to the current field execution.

#### Inherited from

`OrigGraphQLResolveInfo.fieldNodes`

***

### fragments

> `readonly` **fragments**: `ObjMap`\<`FragmentDefinitionNode`\>

Defined in: node\_modules/graphql/type/definition.d.mts:2188

Fragment definitions in the operation document keyed by fragment name.

#### Inherited from

`OrigGraphQLResolveInfo.fragments`

***

### getAbortSignal

> `readonly` **getAbortSignal**: () => `AbortSignal` \| `undefined`

Defined in: [packages/utils/src/Interfaces.ts:74](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L74)

Returns the AbortSignal supplied for this execution, if any.

#### Returns

`AbortSignal` \| `undefined`

#### Overrides

`OrigGraphQLResolveInfo.getAbortSignal`

***

### getAsyncHelpers

> `readonly` **getAsyncHelpers**: () => [`GraphQLResolveInfoHelpers`](/docs/api/utils/src/interfaces/graphqlresolveinfohelpers)

Defined in: [packages/utils/src/Interfaces.ts:76](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L76)

Returns helper functions for tracking asynchronous resolver work.

#### Returns

[`GraphQLResolveInfoHelpers`](/docs/api/utils/src/interfaces/graphqlresolveinfohelpers)

#### Overrides

`OrigGraphQLResolveInfo.getAsyncHelpers`

***

### operation

> `readonly` **operation**: `OperationDefinitionNode`

Defined in: node\_modules/graphql/type/definition.d.mts:2192

The operation selected for execution.

#### Inherited from

`OrigGraphQLResolveInfo.operation`

***

### parentType

> `readonly` **parentType**: `GraphQLObjectType`

Defined in: node\_modules/graphql/type/definition.d.mts:2182

Object type that owns the current field.

#### Inherited from

`OrigGraphQLResolveInfo.parentType`

***

### path

> `readonly` **path**: `Path`

Defined in: node\_modules/graphql/type/definition.d.mts:2184

Response path where this error occurred during execution.

#### Inherited from

`OrigGraphQLResolveInfo.path`

***

### returnType

> `readonly` **returnType**: `GraphQLOutputType`

Defined in: node\_modules/graphql/type/definition.d.mts:2180

GraphQL output type declared for the current field.

#### Inherited from

`OrigGraphQLResolveInfo.returnType`

***

### rootValue

> `readonly` **rootValue**: `unknown`

Defined in: node\_modules/graphql/type/definition.d.mts:2190

Initial root value passed to the operation.

#### Inherited from

`OrigGraphQLResolveInfo.rootValue`

***

### schema

> `readonly` **schema**: `GraphQLSchema`

Defined in: node\_modules/graphql/type/definition.d.mts:2186

The schema used for validation or execution.

#### Inherited from

`OrigGraphQLResolveInfo.schema`

***

### signal?

> `optional` **signal?**: `AbortSignal`

Defined in: [packages/utils/src/Interfaces.ts:72](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L72)

***

### variableValues

> `readonly` **variableValues**: `VariableValues`

Defined in: node\_modules/graphql/type/definition.d.mts:2197

Coerced variable values and source metadata for this operation. Resolver
code that needs runtime variable values should read `variableValues.coerced`.

#### Inherited from

`OrigGraphQLResolveInfo.variableValues`
