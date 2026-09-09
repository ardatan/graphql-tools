---
title: "IFieldResolverOptions"
description: "The IFieldResolverOptions interface exported by @graphql-tools/utils."
---

Defined in: [packages/utils/src/Interfaces.ts:237](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L237)

## Type Parameters

### TSource

`TSource` = `any`

### TContext

`TContext` = `any`

### TArgs

`TArgs` = `any`

## Properties

### args?

> `optional` **args?**: `GraphQLArgument`[]

Defined in: [packages/utils/src/Interfaces.ts:241](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L241)

***

### astNode?

> `optional` **astNode?**: `FieldDefinitionNode`

Defined in: [packages/utils/src/Interfaces.ts:247](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L247)

***

### deprecationReason?

> `optional` **deprecationReason?**: `string`

Defined in: [packages/utils/src/Interfaces.ts:245](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L245)

***

### description?

> `optional` **description?**: `string`

Defined in: [packages/utils/src/Interfaces.ts:239](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L239)

***

### extensions?

> `optional` **extensions?**: `Record`\<`string`, `any`\>

Defined in: [packages/utils/src/Interfaces.ts:246](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L246)

***

### isDeprecated?

> `optional` **isDeprecated?**: `boolean`

Defined in: [packages/utils/src/Interfaces.ts:244](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L244)

***

### name?

> `optional` **name?**: `string`

Defined in: [packages/utils/src/Interfaces.ts:238](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L238)

***

### resolve?

> `optional` **resolve?**: [`IFieldResolver`](/docs/api/utils/src/type-aliases/ifieldresolver)\<`TSource`, `TContext`, `TArgs`, `any`\>

Defined in: [packages/utils/src/Interfaces.ts:242](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L242)

***

### selectionSet?

> `optional` **selectionSet?**: `string` \| ((`node`) => `SelectionSetNode`)

Defined in: node\_modules/@graphql-tools/stitch/dist/index.d.ts:84

***

### subscribe?

> `optional` **subscribe?**: [`IFieldResolver`](/docs/api/utils/src/type-aliases/ifieldresolver)\<`TSource`, `TContext`, `TArgs`, `any`\>

Defined in: [packages/utils/src/Interfaces.ts:243](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L243)

***

### type?

> `optional` **type?**: `GraphQLOutputType`

Defined in: [packages/utils/src/Interfaces.ts:240](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L240)
