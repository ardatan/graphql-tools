---
title: "extractImportLines"
description: "The extractImportLines function exported by @graphql-tools/import."
---

> **extractImportLines**(`fileContent`): `object`

Defined in: [packages/import/src/index.ts:833](https://github.com/ardatan/graphql-tools/blob/master/packages/import/src/index.ts#L833)

Splits the contents of a GraphQL file into lines that are imports
and other lines which define the actual GraphQL document.

## Parameters

### fileContent

`string`

## Returns

`object`

### importLines

> **importLines**: `string`[]

### otherLines

> **otherLines**: `string`
