[graphql-tools-monorepo](../README) /
[loaders/graphql-file/src](../modules/loaders_graphql_file_src) / GraphQLFileLoader

# Class: GraphQLFileLoader

[loaders/graphql-file/src](../modules/loaders_graphql_file_src).GraphQLFileLoader

This loader loads documents and type definitions from `.graphql` files.

You can load a single source:

```js
const schema = await loadSchema('schema.graphql', {
  loaders: [new GraphQLFileLoader()]
})
```

Or provide a glob pattern to load multiple sources:

```js
const schema = await loadSchema('graphql/*.graphql', {
  loaders: [new GraphQLFileLoader()]
})
```

## Implements

- [`Loader`](/docs/api/interfaces/utils_src.Loader)\<[`GraphQLFileLoaderOptions`](/docs/api/interfaces/loaders_graphql_file_src.GraphQLFileLoaderOptions)>

## Table of contents

### Constructors

- [constructor](loaders_graphql_file_src.GraphQLFileLoader#constructor)

### Methods

- [canLoad](loaders_graphql_file_src.GraphQLFileLoader#canload)
- [canLoadSync](loaders_graphql_file_src.GraphQLFileLoader#canloadsync)
- [handleFileContent](loaders_graphql_file_src.GraphQLFileLoader#handlefilecontent)
- [load](loaders_graphql_file_src.GraphQLFileLoader#load)
- [loadSync](loaders_graphql_file_src.GraphQLFileLoader#loadsync)
- [resolveGlobs](loaders_graphql_file_src.GraphQLFileLoader#resolveglobs)
- [resolveGlobsSync](loaders_graphql_file_src.GraphQLFileLoader#resolveglobssync)

## Constructors

### constructor

• **new GraphQLFileLoader**()

## Methods

### canLoad

▸ **canLoad**(`pointer`, `options`): `Promise`\<`boolean`>

#### Parameters

| Name      | Type                                                                                                 |
| :-------- | :--------------------------------------------------------------------------------------------------- |
| `pointer` | `string`                                                                                             |
| `options` | [`GraphQLFileLoaderOptions`](/docs/api/interfaces/loaders_graphql_file_src.GraphQLFileLoaderOptions) |

#### Returns

`Promise`\<`boolean`>

#### Defined in

[packages/loaders/graphql-file/src/index.ts:66](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/graphql-file/src/index.ts#L66)

---

### canLoadSync

▸ **canLoadSync**(`pointer`, `options`): `boolean`

#### Parameters

| Name      | Type                                                                                                 |
| :-------- | :--------------------------------------------------------------------------------------------------- |
| `pointer` | `string`                                                                                             |
| `options` | [`GraphQLFileLoaderOptions`](/docs/api/interfaces/loaders_graphql_file_src.GraphQLFileLoaderOptions) |

#### Returns

`boolean`

#### Defined in

[packages/loaders/graphql-file/src/index.ts:84](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/graphql-file/src/index.ts#L84)

---

### handleFileContent

▸ **handleFileContent**(`rawSDL`, `pointer`, `options`): `Object`

#### Parameters

| Name      | Type                                                                                                 |
| :-------- | :--------------------------------------------------------------------------------------------------- |
| `rawSDL`  | `string`                                                                                             |
| `pointer` | `string`                                                                                             |
| `options` | [`GraphQLFileLoaderOptions`](/docs/api/interfaces/loaders_graphql_file_src.GraphQLFileLoaderOptions) |

#### Returns

`Object`

| Name       | Type                    |
| :--------- | :---------------------- |
| `document` | `DocumentNode`          |
| `location` | `undefined` \| `string` |

#### Defined in

[packages/loaders/graphql-file/src/index.ts:200](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/graphql-file/src/index.ts#L200)

---

### load

▸ **load**(`pointer`, `options`): `Promise`\<[`Source`](/docs/api/interfaces/utils_src.Source)[]>

#### Parameters

| Name      | Type                                                                                                 |
| :-------- | :--------------------------------------------------------------------------------------------------- |
| `pointer` | `string`                                                                                             |
| `options` | [`GraphQLFileLoaderOptions`](/docs/api/interfaces/loaders_graphql_file_src.GraphQLFileLoaderOptions) |

#### Returns

`Promise`\<[`Source`](/docs/api/interfaces/utils_src.Source)[]>

#### Implementation of

[Loader](/docs/api/interfaces/utils_src.Loader).[load](/docs/api/interfaces/utils_src.Loader#load)

#### Defined in

[packages/loaders/graphql-file/src/index.ts:128](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/graphql-file/src/index.ts#L128)

---

### loadSync

▸ **loadSync**(`pointer`, `options`): [`Source`](/docs/api/interfaces/utils_src.Source)[]

#### Parameters

| Name      | Type                                                                                                 |
| :-------- | :--------------------------------------------------------------------------------------------------- |
| `pointer` | `string`                                                                                             |
| `options` | [`GraphQLFileLoaderOptions`](/docs/api/interfaces/loaders_graphql_file_src.GraphQLFileLoaderOptions) |

#### Returns

[`Source`](/docs/api/interfaces/utils_src.Source)[]

#### Implementation of

[Loader](/docs/api/interfaces/utils_src.Loader).[loadSync](/docs/api/interfaces/utils_src.Loader#loadsync)

#### Defined in

[packages/loaders/graphql-file/src/index.ts:165](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/graphql-file/src/index.ts#L165)

---

### resolveGlobs

▸ **resolveGlobs**(`glob`, `options`): `Promise`\<`string`[]>

#### Parameters

| Name      | Type                                                                                                 |
| :-------- | :--------------------------------------------------------------------------------------------------- |
| `glob`    | `string`                                                                                             |
| `options` | [`GraphQLFileLoaderOptions`](/docs/api/interfaces/loaders_graphql_file_src.GraphQLFileLoaderOptions) |

#### Returns

`Promise`\<`string`[]>

#### Defined in

[packages/loaders/graphql-file/src/index.ts:102](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/graphql-file/src/index.ts#L102)

---

### resolveGlobsSync

▸ **resolveGlobsSync**(`glob`, `options`): `string`[]

#### Parameters

| Name      | Type                                                                                                 |
| :-------- | :--------------------------------------------------------------------------------------------------- |
| `glob`    | `string`                                                                                             |
| `options` | [`GraphQLFileLoaderOptions`](/docs/api/interfaces/loaders_graphql_file_src.GraphQLFileLoaderOptions) |

#### Returns

`string`[]

#### Defined in

[packages/loaders/graphql-file/src/index.ts:115](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/graphql-file/src/index.ts#L115)
