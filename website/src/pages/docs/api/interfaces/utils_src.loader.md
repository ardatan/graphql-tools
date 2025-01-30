[graphql-tools-monorepo](../README) / [utils/src](../modules/utils_src) / Loader

# Interface: Loader<TOptions\>

[utils/src](../modules/utils_src).Loader

## Type parameters

| Name       | Type                                                                                                                                  |
| :--------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| `TOptions` | extends [`BaseLoaderOptions`](../modules/utils_src#baseloaderoptions) = [`BaseLoaderOptions`](../modules/utils_src#baseloaderoptions) |

## Implemented by

- [`ApolloEngineLoader`](/docs/api/classes/loaders_apollo_engine_src.ApolloEngineLoader)
- [`CodeFileLoader`](/docs/api/classes/loaders_code_file_src.CodeFileLoader)
- [`GitLoader`](/docs/api/classes/loaders_git_src.GitLoader)
- [`GithubLoader`](/docs/api/classes/loaders_github_src.GithubLoader)
- [`GraphQLFileLoader`](/docs/api/classes/loaders_graphql_file_src.GraphQLFileLoader)
- [`JsonFileLoader`](/docs/api/classes/loaders_json_file_src.JsonFileLoader)
- [`ModuleLoader`](/docs/api/classes/loaders_module_src.ModuleLoader)
- [`UrlLoader`](/docs/api/classes/loaders_url_src.UrlLoader)

## Table of contents

### Methods

- [load](utils_src.Loader#load)
- [loadSync](utils_src.Loader#loadsync)

## Methods

### load

▸ **load**(`pointer`, `options?`): `Promise`\<`null` \| [`Source`](utils_src.Source)[]>

#### Parameters

| Name       | Type       |
| :--------- | :--------- |
| `pointer`  | `string`   |
| `options?` | `TOptions` |

#### Returns

`Promise`\<`null` \| [`Source`](utils_src.Source)[]>

#### Defined in

[packages/utils/src/loaders.ts:22](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/loaders.ts#L22)

---

### loadSync

▸ `Optional` **loadSync**(`pointer`, `options?`): `null` \| [`Source`](utils_src.Source)[]

#### Parameters

| Name       | Type       |
| :--------- | :--------- |
| `pointer`  | `string`   |
| `options?` | `TOptions` |

#### Returns

`null` \| [`Source`](utils_src.Source)[]

#### Defined in

[packages/utils/src/loaders.ts:23](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/loaders.ts#L23)
