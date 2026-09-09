---
title: "SingularExecutionResult"
description: "The SingularExecutionResult interface exported by @graphql-tools/executor."
---

Defined in: [packages/executor/src/execution/execute.ts:65](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L65)

## Extended by

- [`InitialIncrementalExecutionResult`](/docs/api/executor/src/interfaces/initialincrementalexecutionresult)
- [`IncrementalDeferResult`](/docs/api/executor/src/interfaces/incrementaldeferresult)

## Type Parameters

### TData

`TData` = `any`

### TExtensions

`TExtensions` = `any`

## Properties

### data?

> `optional` **data?**: `TData` \| `null`

Defined in: [packages/executor/src/execution/execute.ts:67](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L67)

***

### errors?

> `optional` **errors?**: readonly `GraphQLError`[]

Defined in: [packages/executor/src/execution/execute.ts:66](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L66)

***

### extensions?

> `optional` **extensions?**: `TExtensions`

Defined in: [packages/executor/src/execution/execute.ts:68](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L68)
