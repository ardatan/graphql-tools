---
title: "assertValidExecutionArguments"
description: "The assertValidExecutionArguments function exported by @graphql-tools/executor."
---

> **assertValidExecutionArguments**\<`TVariables`\>(`schema`, `document`, `rawVariableValues`): `void`

Defined in: [packages/executor/src/execution/execute.ts:373](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L373)

**`Internal`**

Essential assertions before executing to provide developer feedback for
improper use of the GraphQL library.

## Type Parameters

### TVariables

`TVariables`

## Parameters

### schema

`GraphQLSchema`

### document

`TypedDocumentNode`\<`any`, `TVariables`\>

### rawVariableValues

[`Maybe`](/docs/api/utils/src/type-aliases/maybe)\<`TVariables`\>

## Returns

`void`
