---
title: "getDirectiveValues"
description: "The getDirectiveValues function exported by @graphql-tools/utils."
---

> **getDirectiveValues**\<`TVariables`\>(`directiveDef`, `node`, `variableValues?`): `Record`\<`string`, `unknown`\> \| `undefined`

Defined in: [packages/utils/src/getDirectiveValues.ts:14](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/getDirectiveValues.ts#L14)

GraphQL v17's getDirectiveValues function accepts `VariableValues`
while older versions accept `Record<string, any>`. This function wraps the original
getDirectiveValues function to provide compatibility across versions.

## Type Parameters

### TVariables

`TVariables` = `Record`\<`string`, `unknown`\>

## Parameters

### directiveDef

`GraphQLDirective`

### node

#### directives?

readonly `DirectiveNode`[]

### variableValues?

[`VariableValues`](/docs/api/utils/src/interfaces/variablevalues)\<`TVariables`\>

## Returns

`Record`\<`string`, `unknown`\> \| `undefined`
