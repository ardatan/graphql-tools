---
title: "processImports"
description: "The processImports function exported by @graphql-tools/import."
---

> **processImports**(`importLines`, `filePath`, `visitedFiles`, `predefinedImports`, `pathAliases?`): `object`

Defined in: [packages/import/src/index.ts:692](https://github.com/ardatan/graphql-tools/blob/master/packages/import/src/index.ts#L692)

## Parameters

### importLines

`string`[]

### filePath

`string`

### visitedFiles

[`VisitedFilesMap`](/docs/api/import/src/type-aliases/visitedfilesmap)

### predefinedImports

`Record`\<`string`, `string`\>

### pathAliases?

[`PathAliases`](/docs/api/import/src/interfaces/pathaliases)

## Returns

`object`

### allImportedDefinitionsMap

> **allImportedDefinitionsMap**: `Map`\<`string`, `Set`\<`DefinitionNode`\>\>

### hasWildcardImport

> **hasWildcardImport**: `boolean`

### potentialTransitiveDefinitionsMap

> **potentialTransitiveDefinitionsMap**: `Map`\<`string`, `Set`\<`DefinitionNode`\>\>
