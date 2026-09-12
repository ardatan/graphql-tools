---
title: "parseImportLine"
description: "The parseImportLine function exported by @graphql-tools/import."
---

> **parseImportLine**(`importLine`): `object`

Defined in: [packages/import/src/index.ts:906](https://github.com/ardatan/graphql-tools/blob/master/packages/import/src/index.ts#L906)

Parses an import line, returning a list of entities imported and the file
from which they are imported.

Throws if the import line does not have a correct format.

## Parameters

### importLine

`string`

## Returns

`object`

### from

> **from**: `string`

### imports

> **imports**: `string`[]
