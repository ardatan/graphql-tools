---
title: "InitialIncrementalExecutionResult"
description: "The InitialIncrementalExecutionResult interface exported by @graphql-tools/executor."
---

Defined in: [packages/executor/src/execution/execute.ts:155](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L155)

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

Defined in: [packages/executor/src/execution/execute.ts:161](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L161)

#### Overrides

[`SingularExecutionResult`](/docs/api/executor/src/interfaces/singularexecutionresult).[`extensions`](/docs/api/executor/src/interfaces/singularexecutionresult#extensions)

***

### hasNext

> **hasNext**: `boolean`

Defined in: [packages/executor/src/execution/execute.ts:159](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L159)

***

### incremental?

> `optional` **incremental?**: readonly [`IncrementalResult`](/docs/api/executor/src/type-aliases/incrementalresult)\<`TData`, `TExtensions`\>[]

Defined in: [packages/executor/src/execution/execute.ts:160](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L160)
