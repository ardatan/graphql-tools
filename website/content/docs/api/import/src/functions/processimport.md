---
title: "processImport"
description: "The processImport function exported by @graphql-tools/import."
---

> **processImport**(`filePath`, `cwd?`, `predefinedImports?`, `visitedFiles?`, `pathAliases?`): `DocumentNode`

Defined in: [packages/import/src/index.ts:139](https://github.com/ardatan/graphql-tools/blob/master/packages/import/src/index.ts#L139)

Loads the GraphQL document and recursively resolves all the imports
and copies them into the final document.
processImport does not merge the typeDefs as designed ( https://github.com/ardatan/graphql-tools/issues/2980#issuecomment-1003692728 )

## Parameters

### filePath

`string`

### cwd?

`string` = `...`

### predefinedImports?

`Record`\<`string`, `string`\> = `{}`

### visitedFiles?

[`VisitedFilesMap`](/docs/api/import/src/type-aliases/visitedfilesmap) = `...`

### pathAliases?

[`PathAliases`](/docs/api/import/src/interfaces/pathaliases)

## Returns

`DocumentNode`
