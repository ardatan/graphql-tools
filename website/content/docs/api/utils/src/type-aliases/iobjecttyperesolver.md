---
title: "IObjectTypeResolver"
description: "The IObjectTypeResolver type alias exported by @graphql-tools/utils."
---

> **IObjectTypeResolver**\<`TSource`, `TContext`, `TArgs`\> = `object` & `object`

Defined in: [packages/utils/src/Interfaces.ts:320](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L320)

## Type Declaration

### \_\_astNode?

> `optional` **\_\_astNode?**: `ObjectTypeDefinitionNode`

### \_\_description?

> `optional` **\_\_description?**: `string`

### \_\_extensionASTNodes?

> `optional` **\_\_extensionASTNodes?**: `ObjectTypeExtensionNode`

### \_\_extensions?

> `optional` **\_\_extensions?**: `Record`\<`string`, `any`\>

### \_\_isTypeOf?

> `optional` **\_\_isTypeOf?**: `GraphQLIsTypeOfFn`\<`TSource`, `TContext`\>

### \_\_name?

> `optional` **\_\_name?**: `string`

## Type Parameters

### TSource

`TSource` = `any`

### TContext

`TContext` = `any`

### TArgs

`TArgs` = `any`
