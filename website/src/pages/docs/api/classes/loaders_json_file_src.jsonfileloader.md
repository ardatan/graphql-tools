[graphql-tools-monorepo](../README) / [loaders/json-file/src](../modules/loaders_json_file_src) /
JsonFileLoader

# Class: JsonFileLoader

[loaders/json-file/src](../modules/loaders_json_file_src).JsonFileLoader

This loader loads documents and type definitions from JSON files.

The JSON file can be the result of an introspection query made against a schema:

```js
const schema = await loadSchema('schema-introspection.json', {
  loaders: [new JsonFileLoader()]
})
```

Or it can be a `DocumentNode` object representing a GraphQL document or type definitions:

```js
const documents = await loadDocuments('queries/*.json', {
  loaders: [new GraphQLFileLoader()]
})
```

## Implements

- [`Loader`](/docs/api/interfaces/utils_src.Loader)

## Table of contents

### Constructors

- [constructor](loaders_json_file_src.JsonFileLoader#constructor)

### Methods

- [canLoad](loaders_json_file_src.JsonFileLoader#canload)
- [canLoadSync](loaders_json_file_src.JsonFileLoader#canloadsync)
- [handleFileContent](loaders_json_file_src.JsonFileLoader#handlefilecontent)
- [load](loaders_json_file_src.JsonFileLoader#load)
- [loadSync](loaders_json_file_src.JsonFileLoader#loadsync)
- [resolveGlobs](loaders_json_file_src.JsonFileLoader#resolveglobs)
- [resolveGlobsSync](loaders_json_file_src.JsonFileLoader#resolveglobssync)

## Constructors

### constructor

• **new JsonFileLoader**()

## Methods

### canLoad

▸ **canLoad**(`pointer`, `options`): `Promise`\<`boolean`>

#### Parameters

| Name      | Type                                                                                        |
| :-------- | :------------------------------------------------------------------------------------------ |
| `pointer` | `string`                                                                                    |
| `options` | [`JsonFileLoaderOptions`](/docs/api/interfaces/loaders_json_file_src.JsonFileLoaderOptions) |

#### Returns

`Promise`\<`boolean`>

#### Defined in

[packages/loaders/json-file/src/index.ts:55](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/json-file/src/index.ts#L55)

---

### canLoadSync

▸ **canLoadSync**(`pointer`, `options`): `boolean`

#### Parameters

| Name      | Type                                                                                        |
| :-------- | :------------------------------------------------------------------------------------------ |
| `pointer` | `string`                                                                                    |
| `options` | [`JsonFileLoaderOptions`](/docs/api/interfaces/loaders_json_file_src.JsonFileLoaderOptions) |

#### Returns

`boolean`

#### Defined in

[packages/loaders/json-file/src/index.ts:73](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/json-file/src/index.ts#L73)

---

### handleFileContent

▸ **handleFileContent**(`normalizedFilePath`, `rawSDL`, `options`):
[`Source`](/docs/api/interfaces/utils_src.Source)

#### Parameters

| Name                 | Type                                                                                        |
| :------------------- | :------------------------------------------------------------------------------------------ |
| `normalizedFilePath` | `string`                                                                                    |
| `rawSDL`             | `string`                                                                                    |
| `options`            | [`JsonFileLoaderOptions`](/docs/api/interfaces/loaders_json_file_src.JsonFileLoaderOptions) |

#### Returns

[`Source`](/docs/api/interfaces/utils_src.Source)

#### Defined in

[packages/loaders/json-file/src/index.ts:175](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/json-file/src/index.ts#L175)

---

### load

▸ **load**(`pointer`, `options`): `Promise`\<[`Source`](/docs/api/interfaces/utils_src.Source)[]>

#### Parameters

| Name      | Type                                                                                        |
| :-------- | :------------------------------------------------------------------------------------------ |
| `pointer` | `string`                                                                                    |
| `options` | [`JsonFileLoaderOptions`](/docs/api/interfaces/loaders_json_file_src.JsonFileLoaderOptions) |

#### Returns

`Promise`\<[`Source`](/docs/api/interfaces/utils_src.Source)[]>

#### Implementation of

[Loader](/docs/api/interfaces/utils_src.Loader).[load](/docs/api/interfaces/utils_src.Loader#load)

#### Defined in

[packages/loaders/json-file/src/index.ts:103](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/json-file/src/index.ts#L103)

---

### loadSync

▸ **loadSync**(`pointer`, `options`): [`Source`](/docs/api/interfaces/utils_src.Source)[]

#### Parameters

| Name      | Type                                                                                        |
| :-------- | :------------------------------------------------------------------------------------------ |
| `pointer` | `string`                                                                                    |
| `options` | [`JsonFileLoaderOptions`](/docs/api/interfaces/loaders_json_file_src.JsonFileLoaderOptions) |

#### Returns

[`Source`](/docs/api/interfaces/utils_src.Source)[]

#### Implementation of

[Loader](/docs/api/interfaces/utils_src.Loader).[loadSync](/docs/api/interfaces/utils_src.Loader#loadsync)

#### Defined in

[packages/loaders/json-file/src/index.ts:140](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/json-file/src/index.ts#L140)

---

### resolveGlobs

▸ **resolveGlobs**(`glob`, `options`): `Promise`\<`string`[]>

#### Parameters

| Name      | Type                                                                                        |
| :-------- | :------------------------------------------------------------------------------------------ |
| `glob`    | `string`                                                                                    |
| `options` | [`JsonFileLoaderOptions`](/docs/api/interfaces/loaders_json_file_src.JsonFileLoaderOptions) |

#### Returns

`Promise`\<`string`[]>

#### Defined in

[packages/loaders/json-file/src/index.ts:91](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/json-file/src/index.ts#L91)

---

### resolveGlobsSync

▸ **resolveGlobsSync**(`glob`, `options`): `string`[]

#### Parameters

| Name      | Type                                                                                        |
| :-------- | :------------------------------------------------------------------------------------------ |
| `glob`    | `string`                                                                                    |
| `options` | [`JsonFileLoaderOptions`](/docs/api/interfaces/loaders_json_file_src.JsonFileLoaderOptions) |

#### Returns

`string`[]

#### Defined in

[packages/loaders/json-file/src/index.ts:97](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/json-file/src/index.ts#L97)
