---
title: "getFieldDef"
description: "The getFieldDef function exported by @graphql-tools/executor."
---

> **getFieldDef**(`schema`, `parentType`, `fieldNode`): [`Maybe`](/docs/api/utils/src/type-aliases/maybe)\<`GraphQLField`\<`unknown`, `unknown`, `any`\>\>

Defined in: [packages/executor/src/execution/execute.ts:2439](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L2439)

**`Internal`**

This method looks up the field on the given type definition.
It has special casing for the three introspection fields,
__schema, __type and __typename. __typename is special because
it can always be queried as a field, even in situations where no
other fields are allowed, like on a Union. __schema and __type
could get automatically added to the query type, but that would
require mutating type definitions, which would cause issues.

## Parameters

### schema

`GraphQLSchema`

### parentType

`GraphQLObjectType`

### fieldNode

`FieldNode`

## Returns

[`Maybe`](/docs/api/utils/src/type-aliases/maybe)\<`GraphQLField`\<`unknown`, `unknown`, `any`\>\>
