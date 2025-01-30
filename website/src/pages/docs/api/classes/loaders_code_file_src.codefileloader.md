[graphql-tools-monorepo](../README) / [loaders/code-file/src](../modules/loaders_code_file_src) /
CodeFileLoader

# Class: CodeFileLoader

[loaders/code-file/src](../modules/loaders_code_file_src).CodeFileLoader

This loader loads GraphQL documents and type definitions from code files using `graphql-tag-pluck`.

```js
const documents = await loadDocuments('queries/*.js', {
  loaders: [new CodeFileLoader()]
})
```

Supported extensions include: `.ts`, `.mts`, `.cts`, `.tsx`, `.js`, `.mjs`, `.cjs`, `.jsx`, `.vue`,
`.svelte`

## Implements

- [`Loader`](/docs/api/interfaces/utils_src.Loader)\<[`CodeFileLoaderOptions`](../modules/loaders_code_file_src#codefileloaderoptions)>

## Table of contents

### Constructors

- [constructor](loaders_code_file_src.CodeFileLoader#constructor)

### Methods

- [canLoad](loaders_code_file_src.CodeFileLoader#canload)
- [canLoadSync](loaders_code_file_src.CodeFileLoader#canloadsync)
- [handleSinglePath](loaders_code_file_src.CodeFileLoader#handlesinglepath)
- [handleSinglePathSync](loaders_code_file_src.CodeFileLoader#handlesinglepathsync)
- [load](loaders_code_file_src.CodeFileLoader#load)
- [loadSync](loaders_code_file_src.CodeFileLoader#loadsync)
- [resolveGlobs](loaders_code_file_src.CodeFileLoader#resolveglobs)
- [resolveGlobsSync](loaders_code_file_src.CodeFileLoader#resolveglobssync)

## Constructors

### constructor

• **new CodeFileLoader**(`config?`)

#### Parameters

| Name      | Type                                                                            |
| :-------- | :------------------------------------------------------------------------------ |
| `config?` | [`CodeFileLoaderConfig`](../modules/loaders_code_file_src#codefileloaderconfig) |

#### Defined in

[packages/loaders/code-file/src/index.ts:82](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/code-file/src/index.ts#L82)

## Methods

### canLoad

▸ **canLoad**(`pointer`, `options`): `Promise`\<`boolean`>

#### Parameters

| Name      | Type                                                                              |
| :-------- | :-------------------------------------------------------------------------------- |
| `pointer` | `string`                                                                          |
| `options` | [`CodeFileLoaderOptions`](../modules/loaders_code_file_src#codefileloaderoptions) |

#### Returns

`Promise`\<`boolean`>

#### Defined in

[packages/loaders/code-file/src/index.ts:94](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/code-file/src/index.ts#L94)

---

### canLoadSync

▸ **canLoadSync**(`pointer`, `options`): `boolean`

#### Parameters

| Name      | Type                                                                              |
| :-------- | :-------------------------------------------------------------------------------- |
| `pointer` | `string`                                                                          |
| `options` | [`CodeFileLoaderOptions`](../modules/loaders_code_file_src#codefileloaderoptions) |

#### Returns

`boolean`

#### Defined in

[packages/loaders/code-file/src/index.ts:114](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/code-file/src/index.ts#L114)

---

### handleSinglePath

▸ **handleSinglePath**(`location`, `options`):
`Promise`\<[`Source`](/docs/api/interfaces/utils_src.Source)[]>

#### Parameters

| Name       | Type                                                                              |
| :--------- | :-------------------------------------------------------------------------------- |
| `location` | `string`                                                                          |
| `options`  | [`CodeFileLoaderOptions`](../modules/loaders_code_file_src#codefileloaderoptions) |

#### Returns

`Promise`\<[`Source`](/docs/api/interfaces/utils_src.Source)[]>

#### Defined in

[packages/loaders/code-file/src/index.ts:214](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/code-file/src/index.ts#L214)

---

### handleSinglePathSync

▸ **handleSinglePathSync**(`location`, `options`): `null` \|
[`Source`](/docs/api/interfaces/utils_src.Source)[]

#### Parameters

| Name       | Type                                                                              |
| :--------- | :-------------------------------------------------------------------------------- |
| `location` | `string`                                                                          |
| `options`  | [`CodeFileLoaderOptions`](../modules/loaders_code_file_src#codefileloaderoptions) |

#### Returns

`null` \| [`Source`](/docs/api/interfaces/utils_src.Source)[]

#### Defined in

[packages/loaders/code-file/src/index.ts:276](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/code-file/src/index.ts#L276)

---

### load

▸ **load**(`pointer`, `options`): `Promise`\<[`Source`](/docs/api/interfaces/utils_src.Source)[]>

#### Parameters

| Name      | Type                                                                              |
| :-------- | :-------------------------------------------------------------------------------- |
| `pointer` | `string`                                                                          |
| `options` | [`CodeFileLoaderOptions`](../modules/loaders_code_file_src#codefileloaderoptions) |

#### Returns

`Promise`\<[`Source`](/docs/api/interfaces/utils_src.Source)[]>

#### Implementation of

[Loader](/docs/api/interfaces/utils_src.Loader).[load](/docs/api/interfaces/utils_src.Loader#load)

#### Defined in

[packages/loaders/code-file/src/index.ts:147](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/code-file/src/index.ts#L147)

---

### loadSync

▸ **loadSync**(`pointer`, `options`): `null` \| [`Source`](/docs/api/interfaces/utils_src.Source)[]

#### Parameters

| Name      | Type                                                                              |
| :-------- | :-------------------------------------------------------------------------------- |
| `pointer` | `string`                                                                          |
| `options` | [`CodeFileLoaderOptions`](../modules/loaders_code_file_src#codefileloaderoptions) |

#### Returns

`null` \| [`Source`](/docs/api/interfaces/utils_src.Source)[]

#### Implementation of

[Loader](/docs/api/interfaces/utils_src.Loader).[loadSync](/docs/api/interfaces/utils_src.Loader#loadsync)

#### Defined in

[packages/loaders/code-file/src/index.ts:181](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/code-file/src/index.ts#L181)

---

### resolveGlobs

▸ **resolveGlobs**(`glob`, `options`): `Promise`\<`string`[]>

#### Parameters

| Name      | Type                                                                              |
| :-------- | :-------------------------------------------------------------------------------- |
| `glob`    | `string`                                                                          |
| `options` | [`CodeFileLoaderOptions`](../modules/loaders_code_file_src#codefileloaderoptions) |

#### Returns

`Promise`\<`string`[]>

#### Defined in

[packages/loaders/code-file/src/index.ts:135](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/code-file/src/index.ts#L135)

---

### resolveGlobsSync

▸ **resolveGlobsSync**(`glob`, `options`): `string`[]

#### Parameters

| Name      | Type                                                                              |
| :-------- | :-------------------------------------------------------------------------------- |
| `glob`    | `string`                                                                          |
| `options` | [`CodeFileLoaderOptions`](../modules/loaders_code_file_src#codefileloaderoptions) |

#### Returns

`string`[]

#### Defined in

[packages/loaders/code-file/src/index.ts:141](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/code-file/src/index.ts#L141)
