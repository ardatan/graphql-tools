---
title: "getVariableValues"
description: "The getVariableValues function exported by @graphql-tools/executor."
---

> **getVariableValues**(`schema`, `varDefNodes`, `inputs`, `options?`): [`VariableValuesOrErrors`](/docs/api/executor/src/type-aliases/variablevaluesorerrors)

Defined in: [packages/executor/src/execution/values.ts:36](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/values.ts#L36)

Prepares an object map of variableValues of the correct type based on the
provided variable definitions and arbitrary input. If the input cannot be
parsed to match the variable definitions, a GraphQLError will be thrown.

Note: The returned value is a plain Object with a prototype, since it is
exposed to user code. Care should be taken to not pull values from the
Object prototype.

## Parameters

### schema

`GraphQLSchema`

### varDefNodes

readonly `VariableDefinitionNode`[]

### inputs

### options?

#### maxErrors?

`number`

## Returns

[`VariableValuesOrErrors`](/docs/api/executor/src/type-aliases/variablevaluesorerrors)
