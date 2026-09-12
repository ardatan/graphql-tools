---
title: "isDocumentString"
description: "The isDocumentString function exported by @graphql-tools/utils."
---

> **isDocumentString**(`str`): `boolean`

Defined in: [packages/utils/src/helpers.ts:51](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/helpers.ts#L51)

Determines if a given input is a valid GraphQL document string.

## Parameters

### str

`any`

The input to validate as a GraphQL document

## Returns

`boolean`

A boolean indicating whether the input is a valid GraphQL document string

## Remarks

This function performs several validation checks:
- Ensures the input is a string
- Filters out strings with invalid document extensions
- Excludes URLs
- Attempts to parse the string as a GraphQL document

## Throws

If the document fails to parse and is empty except GraphQL comments
