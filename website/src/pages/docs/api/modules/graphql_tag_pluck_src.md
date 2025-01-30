# @graphql-tools/graphql-tag-pluck

### Interfaces

- [GraphQLTagPluckOptions](/docs/api/interfaces/graphql_tag_pluck_src.GraphQLTagPluckOptions)

### Functions

- [gqlPluckFromCodeString](graphql_tag_pluck_src#gqlpluckfromcodestring)
- [gqlPluckFromCodeStringSync](graphql_tag_pluck_src#gqlpluckfromcodestringsync)
- [parseCode](graphql_tag_pluck_src#parsecode)

## Functions

### gqlPluckFromCodeString

▸ **gqlPluckFromCodeString**(`filePath`, `code`, `options?`): `Promise`\<`Source`[]>

Asynchronously plucks GraphQL template literals from a single file.

Supported file extensions include: `.js`, `.mjs`, `.cjs`, `.jsx`, `.ts`, `.mts`, `.cts`, `.tsx`,
`.flow`, `.flow.js`, `.flow.jsx`, `.vue`, `.svelte`

#### Parameters

| Name       | Type                                                                                          | Description                                                            |
| :--------- | :-------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------- |
| `filePath` | `string`                                                                                      | Path to the file containing the code. Required to detect the file type |
| `code`     | `string`                                                                                      | The contents of the file being parsed.                                 |
| `options`  | [`GraphQLTagPluckOptions`](/docs/api/interfaces/graphql_tag_pluck_src.GraphQLTagPluckOptions) | Additional options for determining how a file is parsed.               |

#### Returns

`Promise`\<`Source`[]>

#### Defined in

[packages/graphql-tag-pluck/src/index.ts:171](https://github.com/ardatan/graphql-tools/blob/master/packages/graphql-tag-pluck/src/index.ts#L171)

---

### gqlPluckFromCodeStringSync

▸ **gqlPluckFromCodeStringSync**(`filePath`, `code`, `options?`): `Source`[]

Synchronously plucks GraphQL template literals from a single file

Supported file extensions include: `.js`, `.mjs`, `.cjs`, `.jsx`, `.ts`, `.mjs`, `.cjs`, `.tsx`,
`.flow`, `.flow.js`, `.flow.jsx`, `.vue`, `.svelte`

#### Parameters

| Name       | Type                                                                                          | Description                                                            |
| :--------- | :-------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------- |
| `filePath` | `string`                                                                                      | Path to the file containing the code. Required to detect the file type |
| `code`     | `string`                                                                                      | The contents of the file being parsed.                                 |
| `options`  | [`GraphQLTagPluckOptions`](/docs/api/interfaces/graphql_tag_pluck_src.GraphQLTagPluckOptions) | Additional options for determining how a file is parsed.               |

#### Returns

`Source`[]

#### Defined in

[packages/graphql-tag-pluck/src/index.ts:199](https://github.com/ardatan/graphql-tools/blob/master/packages/graphql-tag-pluck/src/index.ts#L199)

---

### parseCode

▸ **parseCode**(`«destructured»`): `PluckedContent`[]

#### Parameters

| Name             | Type                                                                                          |
| :--------------- | :-------------------------------------------------------------------------------------------- |
| `«destructured»` | `Object`                                                                                      |
| › `code`         | `string`                                                                                      |
| › `filePath`     | `string`                                                                                      |
| › `options`      | [`GraphQLTagPluckOptions`](/docs/api/interfaces/graphql_tag_pluck_src.GraphQLTagPluckOptions) |

#### Returns

`PluckedContent`[]

#### Defined in

[packages/graphql-tag-pluck/src/index.ts:218](https://github.com/ardatan/graphql-tools/blob/master/packages/graphql-tag-pluck/src/index.ts#L218)
