---
title: "collectFields"
description: "The collectFields function exported by @graphql-tools/utils."
---

> **collectFields**\<`TVariables`\>(`schema`, `fragments`, `variableValues`, `runtimeType`, `selectionSet`): [`FieldsAndPatches`](/docs/api/utils/src/interfaces/fieldsandpatches)

Defined in: [packages/utils/src/collectFields.ts:153](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/collectFields.ts#L153)

Given a selectionSet, collects all of the fields and returns them.

CollectFields requires the "runtime type" of an object. For a field that
returns an Interface or Union type, the "runtime type" will be the actual
object type returned by that field.

## Type Parameters

### TVariables

`TVariables` = `any`

## Parameters

### schema

`GraphQLSchema`

### fragments

`Record`\<`string`, `FragmentDefinitionNode`\>

### variableValues

[`VariableValues`](/docs/api/utils/src/interfaces/variablevalues)\<`TVariables`\>

### runtimeType

`GraphQLObjectType`

### selectionSet

`SelectionSetNode`

## Returns

[`FieldsAndPatches`](/docs/api/utils/src/interfaces/fieldsandpatches)
