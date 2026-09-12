---
title: "shouldIncludeNode"
description: "The shouldIncludeNode function exported by @graphql-tools/utils."
---

> **shouldIncludeNode**\<`TVariables`\>(`variableValues`, `node`): `boolean`

Defined in: [packages/utils/src/collectFields.ts:179](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/collectFields.ts#L179)

Determines if a field should be included based on the `@include` and `@skip`
directives, where `@skip` has higher precedence than `@include`.

## Type Parameters

### TVariables

`TVariables` = `any`

## Parameters

### variableValues

[`VariableValues`](/docs/api/utils/src/interfaces/variablevalues)\<`TVariables`\>

### node

`FieldNode` \| `FragmentSpreadNode` \| `InlineFragmentNode`

## Returns

`boolean`
