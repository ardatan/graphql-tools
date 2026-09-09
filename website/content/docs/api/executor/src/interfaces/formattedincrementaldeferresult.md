---
title: "FormattedIncrementalDeferResult"
description: "The FormattedIncrementalDeferResult interface exported by @graphql-tools/executor."
---

Defined in: [packages/executor/src/execution/execute.ts:199](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L199)

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

Defined in: [packages/executor/src/execution/execute.ts:140](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L140)

#### Inherited from

[`FormattedExecutionResult`](/docs/api/executor/src/interfaces/formattedexecutionresult).[`extensions`](/docs/api/executor/src/interfaces/formattedexecutionresult#extensions)

***

### label?

> `optional` **label?**: `string`

Defined in: [packages/executor/src/execution/execute.ts:204](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L204)

***

### path?

> `optional` **path?**: readonly (`string` \| `number`)[]

Defined in: [packages/executor/src/execution/execute.ts:203](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L203)
