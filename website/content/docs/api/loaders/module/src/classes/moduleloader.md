---
title: "ModuleLoader"
description: "The ModuleLoader class exported by @graphql-tools/module-loader."
---

Defined in: [packages/loaders/module/src/index.ts:39](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/module/src/index.ts#L39)

* This loader loads documents and type definitions from a Node module

```js
const schema = await loadSchema('module:someModuleName#someNamedExport', {
  loaders: [new ModuleLoader()],
})
```

## Implements

- [`Loader`](/docs/api/utils/src/interfaces/loader)

## Constructors

### Constructor

> **new ModuleLoader**(): `ModuleLoader`

#### Returns

`ModuleLoader`

## Methods

### canLoad()

> **canLoad**(`pointer`): `Promise`\<`boolean`\>

Defined in: [packages/loaders/module/src/index.ts:44](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/module/src/index.ts#L44)

#### Parameters

##### pointer

`string`

#### Returns

`Promise`\<`boolean`\>

***

### canLoadSync()

> **canLoadSync**(`pointer`): `boolean`

Defined in: [packages/loaders/module/src/index.ts:58](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/module/src/index.ts#L58)

#### Parameters

##### pointer

`string`

#### Returns

`boolean`

***

### load()

> **load**(`pointer`): `Promise`\<[`Source`](/docs/api/utils/src/interfaces/source)[]\>

Defined in: [packages/loaders/module/src/index.ts:71](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/module/src/index.ts#L71)

#### Parameters

##### pointer

`string`

#### Returns

`Promise`\<[`Source`](/docs/api/utils/src/interfaces/source)[]\>

#### Implementation of

[`Loader`](/docs/api/utils/src/interfaces/loader).[`load`](/docs/api/utils/src/interfaces/loader#load)

***

### loadSync()

> **loadSync**(`pointer`): [`Source`](/docs/api/utils/src/interfaces/source)[]

Defined in: [packages/loaders/module/src/index.ts:85](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/module/src/index.ts#L85)

#### Parameters

##### pointer

`string`

#### Returns

[`Source`](/docs/api/utils/src/interfaces/source)[]

#### Implementation of

[`Loader`](/docs/api/utils/src/interfaces/loader).[`loadSync`](/docs/api/utils/src/interfaces/loader#loadsync)
