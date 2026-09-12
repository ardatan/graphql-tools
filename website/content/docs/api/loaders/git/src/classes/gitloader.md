---
title: "GitLoader"
description: "The GitLoader class exported by @graphql-tools/git-loader."
---

Defined in: [packages/loaders/git/src/index.ts:51](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/git/src/index.ts#L51)

This loader loads a file from git.

```js
const typeDefs = await loadTypedefs('git:someBranch:some/path/to/file.js', {
  loaders: [new GitLoader()],
})
```

## Implements

- [`Loader`](/docs/api/utils/src/interfaces/loader)\<[`GitLoaderOptions`](/docs/api/loaders/git/src/type-aliases/gitloaderoptions)\>

## Constructors

### Constructor

> **new GitLoader**(): `GitLoader`

#### Returns

`GitLoader`

## Methods

### canLoad()

> **canLoad**(`pointer`): `Promise`\<`boolean`\>

Defined in: [packages/loaders/git/src/index.ts:52](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/git/src/index.ts#L52)

#### Parameters

##### pointer

`string`

#### Returns

`Promise`\<`boolean`\>

***

### canLoadSync()

> **canLoadSync**(`pointer`): `boolean`

Defined in: [packages/loaders/git/src/index.ts:56](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/git/src/index.ts#L56)

#### Parameters

##### pointer

`string`

#### Returns

`boolean`

***

### load()

> **load**(`pointer`, `options`): `Promise`\<[`Source`](/docs/api/utils/src/interfaces/source)[]\>

Defined in: [packages/loaders/git/src/index.ts:162](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/git/src/index.ts#L162)

#### Parameters

##### pointer

`string`

##### options

[`GitLoaderOptions`](/docs/api/loaders/git/src/type-aliases/gitloaderoptions)

#### Returns

`Promise`\<[`Source`](/docs/api/utils/src/interfaces/source)[]\>

#### Implementation of

[`Loader`](/docs/api/utils/src/interfaces/loader).[`load`](/docs/api/utils/src/interfaces/loader#load)

***

### loadSync()

> **loadSync**(`pointer`, `options`): [`Source`](/docs/api/utils/src/interfaces/source)[]

Defined in: [packages/loaders/git/src/index.ts:233](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/git/src/index.ts#L233)

#### Parameters

##### pointer

`string`

##### options

[`GitLoaderOptions`](/docs/api/loaders/git/src/type-aliases/gitloaderoptions)

#### Returns

[`Source`](/docs/api/utils/src/interfaces/source)[]

#### Implementation of

[`Loader`](/docs/api/utils/src/interfaces/loader).[`loadSync`](/docs/api/utils/src/interfaces/loader#loadsync)

***

### resolveGlobs()

> **resolveGlobs**(`glob`, `ignores`): `Promise`\<`string`[]\>

Defined in: [packages/loaders/git/src/index.ts:60](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/git/src/index.ts#L60)

#### Parameters

##### glob

`string`

##### ignores

`string`[]

#### Returns

`Promise`\<`string`[]\>

***

### resolveGlobsSync()

> **resolveGlobsSync**(`glob`, `ignores`): `string`[]

Defined in: [packages/loaders/git/src/index.ts:100](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/git/src/index.ts#L100)

#### Parameters

##### glob

`string`

##### ignores

`string`[]

#### Returns

`string`[]
