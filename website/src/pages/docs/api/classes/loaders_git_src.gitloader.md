[graphql-tools-monorepo](../README) / [loaders/git/src](../modules/loaders_git_src) / GitLoader

# Class: GitLoader

[loaders/git/src](../modules/loaders_git_src).GitLoader

This loader loads a file from git.

```js
const typeDefs = await loadTypedefs('git:someBranch:some/path/to/file.js', {
  loaders: [new GitLoader()]
})
```

## Implements

- [`Loader`](/docs/api/interfaces/utils_src.Loader)\<[`GitLoaderOptions`](../modules/loaders_git_src#gitloaderoptions)>

## Table of contents

### Constructors

- [constructor](loaders_git_src.GitLoader#constructor)

### Methods

- [canLoad](loaders_git_src.GitLoader#canload)
- [canLoadSync](loaders_git_src.GitLoader#canloadsync)
- [load](loaders_git_src.GitLoader#load)
- [loadSync](loaders_git_src.GitLoader#loadsync)
- [resolveGlobs](loaders_git_src.GitLoader#resolveglobs)
- [resolveGlobsSync](loaders_git_src.GitLoader#resolveglobssync)

## Constructors

### constructor

• **new GitLoader**()

## Methods

### canLoad

▸ **canLoad**(`pointer`): `Promise`\<`boolean`>

#### Parameters

| Name      | Type     |
| :-------- | :------- |
| `pointer` | `string` |

#### Returns

`Promise`\<`boolean`>

#### Defined in

[packages/loaders/git/src/index.ts:52](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/git/src/index.ts#L52)

---

### canLoadSync

▸ **canLoadSync**(`pointer`): `boolean`

#### Parameters

| Name      | Type     |
| :-------- | :------- |
| `pointer` | `string` |

#### Returns

`boolean`

#### Defined in

[packages/loaders/git/src/index.ts:56](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/git/src/index.ts#L56)

---

### load

▸ **load**(`pointer`, `options`): `Promise`\<[`Source`](/docs/api/interfaces/utils_src.Source)[]>

#### Parameters

| Name      | Type                                                              |
| :-------- | :---------------------------------------------------------------- |
| `pointer` | `string`                                                          |
| `options` | [`GitLoaderOptions`](../modules/loaders_git_src#gitloaderoptions) |

#### Returns

`Promise`\<[`Source`](/docs/api/interfaces/utils_src.Source)[]>

#### Implementation of

[Loader](/docs/api/interfaces/utils_src.Loader).[load](/docs/api/interfaces/utils_src.Loader#load)

#### Defined in

[packages/loaders/git/src/index.ts:161](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/git/src/index.ts#L161)

---

### loadSync

▸ **loadSync**(`pointer`, `options`): [`Source`](/docs/api/interfaces/utils_src.Source)[]

#### Parameters

| Name      | Type                                                              |
| :-------- | :---------------------------------------------------------------- |
| `pointer` | `string`                                                          |
| `options` | [`GitLoaderOptions`](../modules/loaders_git_src#gitloaderoptions) |

#### Returns

[`Source`](/docs/api/interfaces/utils_src.Source)[]

#### Implementation of

[Loader](/docs/api/interfaces/utils_src.Loader).[loadSync](/docs/api/interfaces/utils_src.Loader#loadsync)

#### Defined in

[packages/loaders/git/src/index.ts:232](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/git/src/index.ts#L232)

---

### resolveGlobs

▸ **resolveGlobs**(`glob`, `ignores`): `Promise`\<`string`[]>

#### Parameters

| Name      | Type       |
| :-------- | :--------- |
| `glob`    | `string`   |
| `ignores` | `string`[] |

#### Returns

`Promise`\<`string`[]>

#### Defined in

[packages/loaders/git/src/index.ts:60](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/git/src/index.ts#L60)

---

### resolveGlobsSync

▸ **resolveGlobsSync**(`glob`, `ignores`): `string`[]

#### Parameters

| Name      | Type       |
| :-------- | :--------- |
| `glob`    | `string`   |
| `ignores` | `string`[] |

#### Returns

`string`[]

#### Defined in

[packages/loaders/git/src/index.ts:99](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/git/src/index.ts#L99)
