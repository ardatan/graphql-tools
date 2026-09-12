---
title: "GraphQLFileLoader"
description: "The GraphQLFileLoader class exported by @graphql-tools/graphql-file-loader."
---

Defined in: [packages/loaders/graphql-file/src/index.ts:77](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/graphql-file/src/index.ts#L77)

This loader loads documents and type definitions from `.graphql` files.

You can load a single source:

```js
const schema = await loadSchema('schema.graphql', {
  loaders: [
    new GraphQLFileLoader()
  ]
});
```

Or provide a glob pattern to load multiple sources:

```js
const schema = await loadSchema('graphql/*.graphql', {
  loaders: [
    new GraphQLFileLoader()
  ]
});
```

## Implements

- [`Loader`](/docs/api/utils/src/interfaces/loader)\<[`GraphQLFileLoaderOptions`](/docs/api/loaders/graphql-file/src/interfaces/graphqlfileloaderoptions)\>

## Constructors

### Constructor

> **new GraphQLFileLoader**(): `GraphQLFileLoader`

#### Returns

`GraphQLFileLoader`

## Methods

### canLoad()

> **canLoad**(`pointer`, `options`): `Promise`\<`boolean`\>

Defined in: [packages/loaders/graphql-file/src/index.ts:78](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/graphql-file/src/index.ts#L78)

#### Parameters

##### pointer

`string`

##### options

[`GraphQLFileLoaderOptions`](/docs/api/loaders/graphql-file/src/interfaces/graphqlfileloaderoptions)

#### Returns

`Promise`\<`boolean`\>

***

### canLoadSync()

> **canLoadSync**(`pointer`, `options`): `boolean`

Defined in: [packages/loaders/graphql-file/src/index.ts:96](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/graphql-file/src/index.ts#L96)

#### Parameters

##### pointer

`string`

##### options

[`GraphQLFileLoaderOptions`](/docs/api/loaders/graphql-file/src/interfaces/graphqlfileloaderoptions)

#### Returns

`boolean`

***

### handleFileContent()

> **handleFileContent**(`rawSDL`, `pointer`, `options`): `object`

Defined in: [packages/loaders/graphql-file/src/index.ts:215](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/graphql-file/src/index.ts#L215)

#### Parameters

##### rawSDL

`string`

##### pointer

`string`

##### options

[`GraphQLFileLoaderOptions`](/docs/api/loaders/graphql-file/src/interfaces/graphqlfileloaderoptions)

#### Returns

`object`

##### document

> **document**: `DocumentNode`

##### location

> **location**: `string` \| `undefined`

***

### load()

> **load**(`pointer`, `options`): `Promise`\<[`Source`](/docs/api/utils/src/interfaces/source)[]\>

Defined in: [packages/loaders/graphql-file/src/index.ts:143](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/graphql-file/src/index.ts#L143)

#### Parameters

##### pointer

`string`

##### options

[`GraphQLFileLoaderOptions`](/docs/api/loaders/graphql-file/src/interfaces/graphqlfileloaderoptions)

#### Returns

`Promise`\<[`Source`](/docs/api/utils/src/interfaces/source)[]\>

#### Implementation of

[`Loader`](/docs/api/utils/src/interfaces/loader).[`load`](/docs/api/utils/src/interfaces/loader#load)

***

### loadSync()

> **loadSync**(`pointer`, `options`): [`Source`](/docs/api/utils/src/interfaces/source)[]

Defined in: [packages/loaders/graphql-file/src/index.ts:180](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/graphql-file/src/index.ts#L180)

#### Parameters

##### pointer

`string`

##### options

[`GraphQLFileLoaderOptions`](/docs/api/loaders/graphql-file/src/interfaces/graphqlfileloaderoptions)

#### Returns

[`Source`](/docs/api/utils/src/interfaces/source)[]

#### Implementation of

[`Loader`](/docs/api/utils/src/interfaces/loader).[`loadSync`](/docs/api/utils/src/interfaces/loader#loadsync)

***

### resolveGlobs()

> **resolveGlobs**(`glob`, `options`): `Promise`\<`string`[]\>

Defined in: [packages/loaders/graphql-file/src/index.ts:117](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/graphql-file/src/index.ts#L117)

#### Parameters

##### glob

`string`

##### options

[`GraphQLFileLoaderOptions`](/docs/api/loaders/graphql-file/src/interfaces/graphqlfileloaderoptions)

#### Returns

`Promise`\<`string`[]\>

***

### resolveGlobsSync()

> **resolveGlobsSync**(`glob`, `options`): `string`[]

Defined in: [packages/loaders/graphql-file/src/index.ts:130](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/graphql-file/src/index.ts#L130)

#### Parameters

##### glob

`string`

##### options

[`GraphQLFileLoaderOptions`](/docs/api/loaders/graphql-file/src/interfaces/graphqlfileloaderoptions)

#### Returns

`string`[]
