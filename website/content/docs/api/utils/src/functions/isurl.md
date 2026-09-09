---
title: "isUrl"
description: "The isUrl function exported by @graphql-tools/utils."
---

> **isUrl**(`str`): `boolean`

Defined in: [packages/utils/src/helpers.ts:15](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/helpers.ts#L15)

Checks if the given string is a valid URL.

## Parameters

### str

`string`

The string to validate as a URL

## Returns

`boolean`

A boolean indicating whether the string is a valid URL

## Remarks

This function first attempts to use the `URL.canParse` method if available.
If not, it falls back to creating a new `URL` object to validate the string.
