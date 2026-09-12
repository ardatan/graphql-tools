---
title: "CodeFileLoader"
description: "The CodeFileLoader class exported by @graphql-tools/code-file-loader."
---

Defined in: [packages/loaders/code-file/src/index.ts:84](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/code-file/src/index.ts#L84)

This loader loads GraphQL documents and type definitions from code files
using `graphql-tag-pluck`.

```js
const documents = await loadDocuments('queries/*.js', {
  loaders: [
    new CodeFileLoader()
  ]
});
```

Supported extensions include: `.ts`, `.mts`, `.cts`, `.tsx`, `.js`, `.mjs`,
`.cjs`, `.jsx`, `.vue`, `.svelte`, `.astro`, `.gts`, `.gjs`.

## Implements

- [`Loader`](/docs/api/utils/src/interfaces/loader)\<[`CodeFileLoaderOptions`](/docs/api/loaders/code-file/src/type-aliases/codefileloaderoptions)\>

## Constructors

### Constructor

> **new CodeFileLoader**(`config?`): `CodeFileLoader`

Defined in: [packages/loaders/code-file/src/index.ts:86](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/code-file/src/index.ts#L86)

#### Parameters

##### config?

[`CodeFileLoaderConfig`](/docs/api/loaders/code-file/src/type-aliases/codefileloaderconfig)

#### Returns

`CodeFileLoader`

## Methods

### canLoad()

> **canLoad**(`pointer`, `options`): `Promise`\<`boolean`\>

Defined in: [packages/loaders/code-file/src/index.ts:98](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/code-file/src/index.ts#L98)

#### Parameters

##### pointer

`string`

##### options

[`CodeFileLoaderOptions`](/docs/api/loaders/code-file/src/type-aliases/codefileloaderoptions)

#### Returns

`Promise`\<`boolean`\>

***

### canLoadSync()

> **canLoadSync**(`pointer`, `options`): `boolean`

Defined in: [packages/loaders/code-file/src/index.ts:118](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/code-file/src/index.ts#L118)

#### Parameters

##### pointer

`string`

##### options

[`CodeFileLoaderOptions`](/docs/api/loaders/code-file/src/type-aliases/codefileloaderoptions)

#### Returns

`boolean`

***

### handleSinglePath()

> **handleSinglePath**(`location`, `options`): `Promise`\<[`Source`](/docs/api/utils/src/interfaces/source)[]\>

Defined in: [packages/loaders/code-file/src/index.ts:218](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/code-file/src/index.ts#L218)

#### Parameters

##### location

`string`

##### options

[`CodeFileLoaderOptions`](/docs/api/loaders/code-file/src/type-aliases/codefileloaderoptions)

#### Returns

`Promise`\<[`Source`](/docs/api/utils/src/interfaces/source)[]\>

***

### handleSinglePathSync()

> **handleSinglePathSync**(`location`, `options`): [`Source`](/docs/api/utils/src/interfaces/source)[] \| `null`

Defined in: [packages/loaders/code-file/src/index.ts:280](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/code-file/src/index.ts#L280)

#### Parameters

##### location

`string`

##### options

[`CodeFileLoaderOptions`](/docs/api/loaders/code-file/src/type-aliases/codefileloaderoptions)

#### Returns

[`Source`](/docs/api/utils/src/interfaces/source)[] \| `null`

***

### load()

> **load**(`pointer`, `options`): `Promise`\<[`Source`](/docs/api/utils/src/interfaces/source)[]\>

Defined in: [packages/loaders/code-file/src/index.ts:151](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/code-file/src/index.ts#L151)

#### Parameters

##### pointer

`string`

##### options

[`CodeFileLoaderOptions`](/docs/api/loaders/code-file/src/type-aliases/codefileloaderoptions)

#### Returns

`Promise`\<[`Source`](/docs/api/utils/src/interfaces/source)[]\>

#### Implementation of

[`Loader`](/docs/api/utils/src/interfaces/loader).[`load`](/docs/api/utils/src/interfaces/loader#load)

***

### loadSync()

> **loadSync**(`pointer`, `options`): [`Source`](/docs/api/utils/src/interfaces/source)[] \| `null`

Defined in: [packages/loaders/code-file/src/index.ts:185](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/code-file/src/index.ts#L185)

#### Parameters

##### pointer

`string`

##### options

[`CodeFileLoaderOptions`](/docs/api/loaders/code-file/src/type-aliases/codefileloaderoptions)

#### Returns

[`Source`](/docs/api/utils/src/interfaces/source)[] \| `null`

#### Implementation of

[`Loader`](/docs/api/utils/src/interfaces/loader).[`loadSync`](/docs/api/utils/src/interfaces/loader#loadsync)

***

### resolveGlobs()

> **resolveGlobs**(`glob`, `options`): `Promise`\<`string`[]\>

Defined in: [packages/loaders/code-file/src/index.ts:139](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/code-file/src/index.ts#L139)

#### Parameters

##### glob

`string`

##### options

[`CodeFileLoaderOptions`](/docs/api/loaders/code-file/src/type-aliases/codefileloaderoptions)

#### Returns

`Promise`\<`string`[]\>

***

### resolveGlobsSync()

> **resolveGlobsSync**(`glob`, `options`): `string`[]

Defined in: [packages/loaders/code-file/src/index.ts:145](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/code-file/src/index.ts#L145)

#### Parameters

##### glob

`string`

##### options

[`CodeFileLoaderOptions`](/docs/api/loaders/code-file/src/type-aliases/codefileloaderoptions)

#### Returns

`string`[]
