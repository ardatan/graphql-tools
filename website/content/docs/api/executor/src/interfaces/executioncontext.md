---
title: "ExecutionContext"
description: "The ExecutionContext interface exported by @graphql-tools/executor."
---

Defined in: [packages/executor/src/execution/execute.ts:116](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L116)

Data that must be available at all points during query execution.

Namely, schema of the type system that is currently executing,
and the fragments defined in the query document

## Type Parameters

### TVariables

`TVariables` = `any`

### TContext

`TContext` = `any`

## Properties

### contextValue

> **contextValue**: `TContext`

Defined in: [packages/executor/src/execution/execute.ts:120](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L120)

***

### errors

> **errors**: `GraphQLError`[]

Defined in: [packages/executor/src/execution/execute.ts:126](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L126)

***

### fieldResolver

> **fieldResolver**: `GraphQLFieldResolver`\<`any`, `TContext`\>

Defined in: [packages/executor/src/execution/execute.ts:123](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L123)

***

### fragments

> **fragments**: `Record`\<`string`, `FragmentDefinitionNode`\>

Defined in: [packages/executor/src/execution/execute.ts:118](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L118)

***

### operation

> **operation**: `OperationDefinitionNode`

Defined in: [packages/executor/src/execution/execute.ts:121](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L121)

***

### rootValue

> **rootValue**: `unknown`

Defined in: [packages/executor/src/execution/execute.ts:119](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L119)

***

### schema

> **schema**: `GraphQLSchema`

Defined in: [packages/executor/src/execution/execute.ts:117](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L117)

***

### schemaCoordinateInErrors?

> `optional` **schemaCoordinateInErrors?**: `boolean`

Defined in: [packages/executor/src/execution/execute.ts:131](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L131)

***

### signal?

> `optional` **signal?**: `AbortSignal`

Defined in: [packages/executor/src/execution/execute.ts:128](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L128)

***

### signalPromise?

> `optional` **signalPromise?**: `Promise`\<`never`\>

Defined in: [packages/executor/src/execution/execute.ts:130](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L130)

***

### subscribeFieldResolver

> **subscribeFieldResolver**: `GraphQLFieldResolver`\<`any`, `TContext`\>

Defined in: [packages/executor/src/execution/execute.ts:125](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L125)

***

### subsequentPayloads

> **subsequentPayloads**: `Set`\<`AsyncPayloadRecord`\>

Defined in: [packages/executor/src/execution/execute.ts:127](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L127)

***

### typeResolver

> **typeResolver**: `GraphQLTypeResolver`\<`any`, `TContext`\>

Defined in: [packages/executor/src/execution/execute.ts:124](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L124)

***

### variableValues

> **variableValues**: [`VariableValues`](/docs/api/utils/src/interfaces/variablevalues)\<`TVariables`\>

Defined in: [packages/executor/src/execution/execute.ts:122](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L122)

## Methods

### onSignalAbort()?

> `optional` **onSignalAbort**(`handler`): `void`

Defined in: [packages/executor/src/execution/execute.ts:129](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L129)

#### Parameters

##### handler

() => `void`

#### Returns

`void`
