---
title: "getDeferValues"
description: "The getDeferValues function exported by @graphql-tools/utils."
---

> **getDeferValues**\<`TVariables`\>(`variableValues`, `node`): \{ `label`: `string` \| `undefined`; \} \| `undefined`

Defined in: [packages/utils/src/collectFields.ts:230](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/collectFields.ts#L230)

Returns an object containing the `@defer` arguments if a field should be
deferred based on the experimental flag, defer directive present and
not disabled by the "if" argument.

## Type Parameters

### TVariables

`TVariables` = `any`

## Parameters

### variableValues

[`VariableValues`](/docs/api/utils/src/interfaces/variablevalues)\<`TVariables`\>

### node

`FragmentSpreadNode` \| `InlineFragmentNode`

## Returns

\{ `label`: `string` \| `undefined`; \} \| `undefined`
