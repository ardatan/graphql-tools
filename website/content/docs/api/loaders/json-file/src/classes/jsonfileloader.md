---
title: "JsonFileLoader"
description: "The JsonFileLoader class exported by @graphql-tools/json-file-loader."
---

Defined in: [packages/loaders/json-file/src/index.ts:54](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/json-file/src/index.ts#L54)

This loader loads documents and type definitions from JSON files.

The JSON file can be the result of an introspection query made against a schema:

```js
const schema = await loadSchema('schema-introspection.json', {
  loaders: [
    new JsonFileLoader()
  ]
});
```

Or it can be a `DocumentNode` object representing a GraphQL document or type definitions:

```js
const documents = await loadDocuments('queries/*.json', {
  loaders: [
    new GraphQLFileLoader()
  ]
});
```

## Implements

- [`Loader`](/docs/api/utils/src/interfaces/loader)

## Constructors

### Constructor

> **new JsonFileLoader**(): `JsonFileLoader`

#### Returns

`JsonFileLoader`

## Methods

### canLoad()

> **canLoad**(`pointer`, `options`): `Promise`\<`boolean`\>

Defined in: [packages/loaders/json-file/src/index.ts:55](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/json-file/src/index.ts#L55)

#### Parameters

##### pointer

`string`

##### options

[`JsonFileLoaderOptions`](/docs/api/loaders/json-file/src/interfaces/jsonfileloaderoptions)

#### Returns

`Promise`\<`boolean`\>

***

### canLoadSync()

> **canLoadSync**(`pointer`, `options`): `boolean`

Defined in: [packages/loaders/json-file/src/index.ts:73](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/json-file/src/index.ts#L73)

#### Parameters

##### pointer

`string`

##### options

[`JsonFileLoaderOptions`](/docs/api/loaders/json-file/src/interfaces/jsonfileloaderoptions)

#### Returns

`boolean`

***

### handleFileContent()

> **handleFileContent**(`normalizedFilePath`, `rawSDL`, `options`): [`Source`](/docs/api/utils/src/interfaces/source)

Defined in: [packages/loaders/json-file/src/index.ts:175](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/json-file/src/index.ts#L175)

#### Parameters

##### normalizedFilePath

`string`

##### rawSDL

`string`

##### options

[`JsonFileLoaderOptions`](/docs/api/loaders/json-file/src/interfaces/jsonfileloaderoptions)

#### Returns

[`Source`](/docs/api/utils/src/interfaces/source)

***

### load()

> **load**(`pointer`, `options`): `Promise`\<[`Source`](/docs/api/utils/src/interfaces/source)[]\>

Defined in: [packages/loaders/json-file/src/index.ts:103](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/json-file/src/index.ts#L103)

#### Parameters

##### pointer

`string`

##### options

[`JsonFileLoaderOptions`](/docs/api/loaders/json-file/src/interfaces/jsonfileloaderoptions)

#### Returns

`Promise`\<[`Source`](/docs/api/utils/src/interfaces/source)[]\>

#### Implementation of

[`Loader`](/docs/api/utils/src/interfaces/loader).[`load`](/docs/api/utils/src/interfaces/loader#load)

***

### loadSync()

> **loadSync**(`pointer`, `options`): [`Source`](/docs/api/utils/src/interfaces/source)[]

Defined in: [packages/loaders/json-file/src/index.ts:140](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/json-file/src/index.ts#L140)

#### Parameters

##### pointer

`string`

##### options

[`JsonFileLoaderOptions`](/docs/api/loaders/json-file/src/interfaces/jsonfileloaderoptions)

#### Returns

[`Source`](/docs/api/utils/src/interfaces/source)[]

#### Implementation of

[`Loader`](/docs/api/utils/src/interfaces/loader).[`loadSync`](/docs/api/utils/src/interfaces/loader#loadsync)

***

### resolveGlobs()

> **resolveGlobs**(`glob`, `options`): `Promise`\<`string`[]\>

Defined in: [packages/loaders/json-file/src/index.ts:91](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/json-file/src/index.ts#L91)

#### Parameters

##### glob

`string`

##### options

[`JsonFileLoaderOptions`](/docs/api/loaders/json-file/src/interfaces/jsonfileloaderoptions)

#### Returns

`Promise`\<`string`[]\>

***

### resolveGlobsSync()

> **resolveGlobsSync**(`glob`, `options`): `string`[]

Defined in: [packages/loaders/json-file/src/index.ts:97](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/json-file/src/index.ts#L97)

#### Parameters

##### glob

`string`

##### options

[`JsonFileLoaderOptions`](/docs/api/loaders/json-file/src/interfaces/jsonfileloaderoptions)

#### Returns

`string`[]
