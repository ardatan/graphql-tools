---
title: "FormattedInitialIncrementalExecutionResult"
description: "The FormattedInitialIncrementalExecutionResult interface exported by @graphql-tools/executor."
---

Defined in: [packages/executor/src/execution/execute.ts:164](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L164)

## Extends

- [`FormattedExecutionResult`](/docs/api/executor/src/interfaces/formattedexecutionresult)\<`TData`, `TExtensions`\>

## Type Parameters

### TData

`TData` = `Record`\<`string`, `unknown`\>

### TExtensions

`TExtensions` = `Record`\<`string`, `unknown`\>

## Properties

### data?

> `optional` **data?**: `TData` \| `null`

Defined in: [packages/executor/src/execution/execute.ts:139](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L139)

#### Inherited from

[`FormattedExecutionResult`](/docs/api/executor/src/interfaces/formattedexecutionresult).[`data`](/docs/api/executor/src/interfaces/formattedexecutionresult#data)

***

### errors?

> `optional` **errors?**: readonly `GraphQLFormattedError`[]

Defined in: [packages/executor/src/execution/execute.ts:138](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L138)

#### Inherited from

[`FormattedExecutionResult`](/docs/api/executor/src/interfaces/formattedexecutionresult).[`errors`](/docs/api/executor/src/interfaces/formattedexecutionresult#errors)

***

### extensions?

> `optional` **extensions?**: `TExtensions`

Defined in: [packages/executor/src/execution/execute.ts:170](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L170)

#### Overrides

[`FormattedExecutionResult`](/docs/api/executor/src/interfaces/formattedexecutionresult).[`extensions`](/docs/api/executor/src/interfaces/formattedexecutionresult#extensions)

***

### hasNext

> **hasNext**: `boolean`

Defined in: [packages/executor/src/execution/execute.ts:168](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L168)

***

### incremental?

> `optional` **incremental?**: readonly [`FormattedIncrementalResult`](/docs/api/executor/src/type-aliases/formattedincrementalresult)\<`TData`, `TExtensions`\>[]

Defined in: [packages/executor/src/execution/execute.ts:169](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L169)
