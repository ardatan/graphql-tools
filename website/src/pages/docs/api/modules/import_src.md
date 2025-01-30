# @graphql-tools/import

### Type Aliases

- [VisitedFilesMap](import_src#visitedfilesmap)

### Functions

- [extractDependencies](import_src#extractdependencies)
- [extractImportLines](import_src#extractimportlines)
- [parseImportLine](import_src#parseimportline)
- [processImport](import_src#processimport)
- [processImports](import_src#processimports)

## Type Aliases

### VisitedFilesMap

Ƭ **VisitedFilesMap**: `Map`\<`string`, `Map`\<`string`, `Set`\<`DefinitionNode`>>>

#### Defined in

[packages/import/src/index.ts:62](https://github.com/ardatan/graphql-tools/blob/master/packages/import/src/index.ts#L62)

## Functions

### extractDependencies

▸ **extractDependencies**(`filePath`, `fileContents`): `Object`

#### Parameters

| Name           | Type     |
| :------------- | :------- |
| `filePath`     | `string` |
| `fileContents` | `string` |

#### Returns

`Object`

| Name                           | Type                                       |
| :----------------------------- | :----------------------------------------- |
| `definitionsByName`            | `Map`\<`string`, `Set`\<`DefinitionNode`>> |
| `dependenciesByDefinitionName` | `Map`\<`string`, `Set`\<`string`>>         |

#### Defined in

[packages/import/src/index.ts:242](https://github.com/ardatan/graphql-tools/blob/master/packages/import/src/index.ts#L242)

---

### extractImportLines

▸ **extractImportLines**(`fileContent`): `Object`

Splits the contents of a GraphQL file into lines that are imports and other lines which define the
actual GraphQL document.

#### Parameters

| Name          | Type     |
| :------------ | :------- |
| `fileContent` | `string` |

#### Returns

`Object`

| Name          | Type       |
| :------------ | :--------- |
| `importLines` | `string`[] |
| `otherLines`  | `string`   |

#### Defined in

[packages/import/src/index.ts:462](https://github.com/ardatan/graphql-tools/blob/master/packages/import/src/index.ts#L462)

---

### parseImportLine

▸ **parseImportLine**(`importLine`): `Object`

Parses an import line, returning a list of entities imported and the file from which they are
imported.

Throws if the import line does not have a correct format.

#### Parameters

| Name         | Type     |
| :----------- | :------- |
| `importLine` | `string` |

#### Returns

`Object`

| Name      | Type       |
| :-------- | :--------- |
| `from`    | `string`   |
| `imports` | `string`[] |

#### Defined in

[packages/import/src/index.ts:485](https://github.com/ardatan/graphql-tools/blob/master/packages/import/src/index.ts#L485)

---

### processImport

▸ **processImport**(`filePath`, `cwd?`, `predefinedImports?`, `visitedFiles?`): `DocumentNode`

Loads the GraphQL document and recursively resolves all the imports and copies them into the final
document. processImport does not merge the typeDefs as designed (
https://github.com/ardatan/graphql-tools/issues/2980#issuecomment-1003692728 )

#### Parameters

| Name                | Type                                            |
| :------------------ | :---------------------------------------------- |
| `filePath`          | `string`                                        |
| `cwd`               | `string`                                        |
| `predefinedImports` | `Record`\<`string`, `string`>                   |
| `visitedFiles`      | [`VisitedFilesMap`](import_src#visitedfilesmap) |

#### Returns

`DocumentNode`

#### Defined in

[packages/import/src/index.ts:69](https://github.com/ardatan/graphql-tools/blob/master/packages/import/src/index.ts#L69)

---

### processImports

▸ **processImports**(`importLines`, `filePath`, `visitedFiles`, `predefinedImports`): `Object`

#### Parameters

| Name                | Type                                            |
| :------------------ | :---------------------------------------------- |
| `importLines`       | `string`[]                                      |
| `filePath`          | `string`                                        |
| `visitedFiles`      | [`VisitedFilesMap`](import_src#visitedfilesmap) |
| `predefinedImports` | `Record`\<`string`, `string`>                   |

#### Returns

`Object`

| Name                                | Type                                       |
| :---------------------------------- | :----------------------------------------- |
| `allImportedDefinitionsMap`         | `Map`\<`string`, `Set`\<`DefinitionNode`>> |
| `potentialTransitiveDefinitionsMap` | `Map`\<`string`, `Set`\<`DefinitionNode`>> |

#### Defined in

[packages/import/src/index.ts:396](https://github.com/ardatan/graphql-tools/blob/master/packages/import/src/index.ts#L396)
