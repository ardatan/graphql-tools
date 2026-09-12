---
title: "IncrementalDeferResult"
description: "The IncrementalDeferResult interface exported by @graphql-tools/executor."
---

Defined in: [packages/executor/src/execution/execute.ts:191](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L191)

## Extends

- [`SingularExecutionResult`](/docs/api/executor/src/interfaces/singularexecutionresult)\<`TData`, `TExtensions`\>

## Type Parameters

### TData

`TData` = `Record`\<`string`, `unknown`\>

### TExtensions

`TExtensions` = `Record`\<`string`, `unknown`\>

## Properties

### data?

> `optional` **data?**: `TData` \| `null`

Defined in: [packages/executor/src/execution/execute.ts:67](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L67)

#### Inherited from

[`SingularExecutionResult`](/docs/api/executor/src/interfaces/singularexecutionresult).[`data`](/docs/api/executor/src/interfaces/singularexecutionresult#data)

***

### errors?

> `optional` **errors?**: readonly `GraphQLError`[]

Defined in: [packages/executor/src/execution/execute.ts:66](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L66)

#### Inherited from

[`SingularExecutionResult`](/docs/api/executor/src/interfaces/singularexecutionresult).[`errors`](/docs/api/executor/src/interfaces/singularexecutionresult#errors)

***

### extensions?

> `optional` **extensions?**: `TExtensions`

Defined in: [packages/executor/src/execution/execute.ts:68](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L68)

#### Inherited from

[`SingularExecutionResult`](/docs/api/executor/src/interfaces/singularexecutionresult).[`extensions`](/docs/api/executor/src/interfaces/singularexecutionresult#extensions)

***

### label?

> `optional` **label?**: `string`

Defined in: [packages/executor/src/execution/execute.ts:196](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L196)

***

### path?

> `optional` **path?**: readonly (`string` \| `number`)[]

Defined in: [packages/executor/src/execution/execute.ts:195](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L195)
