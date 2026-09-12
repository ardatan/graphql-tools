---
title: "ApolloEngineLoader"
description: "The ApolloEngineLoader class exported by @graphql-tools/apollo-engine-loader."
---

Defined in: [packages/loaders/apollo-engine/src/index.ts:23](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/apollo-engine/src/index.ts#L23)

This loader loads a schema from Apollo Engine

## Implements

- [`Loader`](/docs/api/utils/src/interfaces/loader)\<[`ApolloEngineOptions`](/docs/api/loaders/apollo-engine/src/interfaces/apolloengineoptions)\>

## Constructors

### Constructor

> **new ApolloEngineLoader**(): `ApolloEngineLoader`

#### Returns

`ApolloEngineLoader`

## Methods

### canLoad()

> **canLoad**(`ptr`): `Promise`\<`boolean`\>

Defined in: [packages/loaders/apollo-engine/src/index.ts:49](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/apollo-engine/src/index.ts#L49)

#### Parameters

##### ptr

`string`

#### Returns

`Promise`\<`boolean`\>

***

### canLoadSync()

> **canLoadSync**(`ptr`): `ptr is "apollo-engine"`

Defined in: [packages/loaders/apollo-engine/src/index.ts:53](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/apollo-engine/src/index.ts#L53)

#### Parameters

##### ptr

`string`

#### Returns

`ptr is "apollo-engine"`

***

### load()

> **load**(`pointer`, `options`): `Promise`\<[`Source`](/docs/api/utils/src/interfaces/source)[]\>

Defined in: [packages/loaders/apollo-engine/src/index.ts:57](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/apollo-engine/src/index.ts#L57)

#### Parameters

##### pointer

`string`

##### options

[`ApolloEngineOptions`](/docs/api/loaders/apollo-engine/src/interfaces/apolloengineoptions)

#### Returns

`Promise`\<[`Source`](/docs/api/utils/src/interfaces/source)[]\>

#### Implementation of

[`Loader`](/docs/api/utils/src/interfaces/loader).[`load`](/docs/api/utils/src/interfaces/loader#load)

***

### loadSync()

> **loadSync**(`pointer`, `options`): [`Source`](/docs/api/utils/src/interfaces/source)[]

Defined in: [packages/loaders/apollo-engine/src/index.ts:78](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/apollo-engine/src/index.ts#L78)

#### Parameters

##### pointer

`string`

##### options

[`ApolloEngineOptions`](/docs/api/loaders/apollo-engine/src/interfaces/apolloengineoptions)

#### Returns

[`Source`](/docs/api/utils/src/interfaces/source)[]

#### Implementation of

[`Loader`](/docs/api/utils/src/interfaces/loader).[`loadSync`](/docs/api/utils/src/interfaces/loader#loadsync)
