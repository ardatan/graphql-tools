---
title: "collectSubFields"
description: "The collectSubFields variable exported by @graphql-tools/utils."
---

> `const` **collectSubFields**: (`schema`, `fragments`, `variableValues`, `returnType`, `fieldNodes`) => [`FieldsAndPatches`](/docs/api/utils/src/interfaces/fieldsandpatches)

Defined in: [packages/utils/src/collectFields.ts:258](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/collectFields.ts#L258)

Given an array of field nodes, collects all of the subfields of the passed
in fields, and returns them at the end.

CollectSubFields requires the "return type" of an object. For a field that
returns an Interface or Union type, the "return type" will be the actual
object type returned by that field.

## Parameters

### schema

`GraphQLSchema`

### fragments

`Record`\<`string`, `FragmentDefinitionNode`\>

### variableValues

[`VariableValues`](/docs/api/utils/src/interfaces/variablevalues)

### returnType

`GraphQLObjectType`

### fieldNodes

`FieldNode`[]

## Returns

[`FieldsAndPatches`](/docs/api/utils/src/interfaces/fieldsandpatches)
