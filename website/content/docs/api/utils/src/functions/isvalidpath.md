---
title: "isValidPath"
description: "The isValidPath function exported by @graphql-tools/utils."
---

> **isValidPath**(`str`): `boolean`

Defined in: [packages/utils/src/helpers.ts:90](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/helpers.ts#L90)

Checks whether the `str` contains any path illegal characters.

A string may sometimes look like a path but is not (like an SDL of a simple
GraphQL schema). To make sure we don't yield false-positives in such cases,
we disallow new lines in paths (even though most Unix systems support new
lines in file names).

## Parameters

### str

`any`

## Returns

`boolean`
