# @graphql-tools/load-files

### Interfaces

- [LoadFilesOptions](/docs/api/interfaces/load_files_src.LoadFilesOptions)

### Functions

- [loadFiles](load_files_src#loadfiles)
- [loadFilesSync](load_files_src#loadfilessync)

## Functions

### loadFiles

▸ **loadFiles**(`pattern`, `options?`): `Promise`\<`any`[]>

Asynchronously loads files using the provided glob pattern.

#### Parameters

| Name      | Type                                                                       | Default value             | Description                                        |
| :-------- | :------------------------------------------------------------------------- | :------------------------ | :------------------------------------------------- |
| `pattern` | `string` \| `string`[]                                                     | `undefined`               | Glob pattern or patterns to use when loading files |
| `options` | [`LoadFilesOptions`](/docs/api/interfaces/load_files_src.LoadFilesOptions) | `LoadFilesDefaultOptions` | Additional options                                 |

#### Returns

`Promise`\<`any`[]>

#### Defined in

[packages/load-files/src/index.ts:230](https://github.com/ardatan/graphql-tools/blob/master/packages/load-files/src/index.ts#L230)

---

### loadFilesSync

▸ **loadFilesSync**<`T`\>(`pattern`, `options?`): `T`[]

Synchronously loads files using the provided glob pattern.

#### Type parameters

| Name | Type  |
| :--- | :---- |
| `T`  | `any` |

#### Parameters

| Name      | Type                                                                       | Default value             | Description                                        |
| :-------- | :------------------------------------------------------------------------- | :------------------------ | :------------------------------------------------- |
| `pattern` | `string` \| `string`[]                                                     | `undefined`               | Glob pattern or patterns to use when loading files |
| `options` | [`LoadFilesOptions`](/docs/api/interfaces/load_files_src.LoadFilesOptions) | `LoadFilesDefaultOptions` | Additional options                                 |

#### Returns

`T`[]

#### Defined in

[packages/load-files/src/index.ts:132](https://github.com/ardatan/graphql-tools/blob/master/packages/load-files/src/index.ts#L132)
