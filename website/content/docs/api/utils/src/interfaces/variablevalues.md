---
title: "VariableValues"
description: "The VariableValues interface exported by @graphql-tools/utils."
---

Defined in: [packages/utils/src/types.ts:161](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/types.ts#L161)

## Type Parameters

### TVariables

`TVariables` = `Record`\<`string`, `unknown`\>

## Properties

### coerced

> `readonly` **coerced**: `TVariables`

Defined in: [packages/utils/src/types.ts:163](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/types.ts#L163)

Coerced runtime variable values keyed by variable name.

***

### sources

> `readonly` **sources**: `Record`\<`string`, [`VariableValueSource`](/docs/api/utils/src/interfaces/variablevaluesource)\>

Defined in: [packages/utils/src/types.ts:165](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/types.ts#L165)

Source metadata for each variable value keyed by variable name.
