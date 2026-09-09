---
title: "IMockServer"
description: "The IMockServer interface exported by @graphql-tools/mock."
---

Defined in: [packages/mock/src/types.ts:243](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L243)

## Properties

### query

> **query**: (`query`, `vars?`) => `Promise`\<[`ExecutionResult`](/docs/api/utils/src/interfaces/executionresult)\<`any`, `any`\>\>

Defined in: [packages/mock/src/types.ts:249](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L249)

Executes the provided query against the mocked schema.

#### Parameters

##### query

`string`

GraphQL query to execute

##### vars?

`Record`\<`string`, `any`\>

Variables

#### Returns

`Promise`\<[`ExecutionResult`](/docs/api/utils/src/interfaces/executionresult)\<`any`, `any`\>\>
