---
title: "ExecutionArgs"
description: "The ExecutionArgs interface exported by @graphql-tools/executor."
---

Defined in: [packages/executor/src/execution/execute.ts:241](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L241)

## Type Parameters

### TData

`TData` = `any`

### TVariables

`TVariables` = `any`

### TContext

`TContext` = `any`

## Properties

### contextValue?

> `optional` **contextValue?**: `TContext`

Defined in: [packages/executor/src/execution/execute.ts:245](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L245)

***

### document

> **document**: `TypedDocumentNode`\<`TData`, `TVariables`\>

Defined in: [packages/executor/src/execution/execute.ts:243](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L243)

***

### fieldResolver?

> `optional` **fieldResolver?**: [`Maybe`](/docs/api/utils/src/type-aliases/maybe)\<`GraphQLFieldResolver`\<`any`, `TContext`\>\>

Defined in: [packages/executor/src/execution/execute.ts:248](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L248)

***

### operationName?

> `optional` **operationName?**: [`Maybe`](/docs/api/utils/src/type-aliases/maybe)\<`string`\>

Defined in: [packages/executor/src/execution/execute.ts:247](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L247)

***

### rootValue?

> `optional` **rootValue?**: `unknown`

Defined in: [packages/executor/src/execution/execute.ts:244](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L244)

***

### schema

> **schema**: `GraphQLSchema`

Defined in: [packages/executor/src/execution/execute.ts:242](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L242)

***

### schemaCoordinateInErrors?

> `optional` **schemaCoordinateInErrors?**: `boolean`

Defined in: [packages/executor/src/execution/execute.ts:252](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L252)

***

### signal?

> `optional` **signal?**: `AbortSignal`

Defined in: [packages/executor/src/execution/execute.ts:251](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L251)

***

### subscribeFieldResolver?

> `optional` **subscribeFieldResolver?**: [`Maybe`](/docs/api/utils/src/type-aliases/maybe)\<`GraphQLFieldResolver`\<`any`, `TContext`\>\>

Defined in: [packages/executor/src/execution/execute.ts:250](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L250)

***

### typeResolver?

> `optional` **typeResolver?**: [`Maybe`](/docs/api/utils/src/type-aliases/maybe)\<`GraphQLTypeResolver`\<`any`, `TContext`\>\>

Defined in: [packages/executor/src/execution/execute.ts:249](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L249)

***

### variableValues?

> `optional` **variableValues?**: `TVariables`

Defined in: [packages/executor/src/execution/execute.ts:246](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L246)
