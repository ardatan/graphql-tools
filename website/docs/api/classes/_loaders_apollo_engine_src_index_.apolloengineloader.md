---
id: "_loaders_apollo_engine_src_index_.apolloengineloader"
title: "ApolloEngineLoader"
sidebar_label: "ApolloEngineLoader"
---

This loader loads a schema from Apollo Engine

## Hierarchy

* **ApolloEngineLoader**

## Implements

* [Loader](../interfaces/_utils_src_index_.loader)‹[ApolloEngineOptions](../interfaces/_loaders_apollo_engine_src_index_.apolloengineoptions)›

## Index

### Methods

* [canLoad](_loaders_apollo_engine_src_index_.apolloengineloader.md#canload)
* [canLoadSync](_loaders_apollo_engine_src_index_.apolloengineloader.md#canloadsync)
* [load](_loaders_apollo_engine_src_index_.apolloengineloader.md#load)
* [loadSync](_loaders_apollo_engine_src_index_.apolloengineloader.md#loadsync)
* [loaderId](_loaders_apollo_engine_src_index_.apolloengineloader.md#loaderid)

## Methods

###  canLoad

▸ **canLoad**(`ptr`: string): *Promise‹boolean›*

*Defined in [packages/loaders/apollo-engine/src/index.ts:28](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/apollo-engine/src/index.ts#L28)*

**Parameters:**

Name | Type |
------ | ------ |
`ptr` | string |

**Returns:** *Promise‹boolean›*

___

###  canLoadSync

▸ **canLoadSync**(): *boolean*

*Defined in [packages/loaders/apollo-engine/src/index.ts:32](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/apollo-engine/src/index.ts#L32)*

**Returns:** *boolean*

___

###  load

▸ **load**(`_`: "apollo-engine", `options`: [ApolloEngineOptions](../interfaces/_loaders_apollo_engine_src_index_.apolloengineoptions)): *Promise‹[Source](../interfaces/_utils_src_index_.source)›*

*Defined in [packages/loaders/apollo-engine/src/index.ts:36](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/apollo-engine/src/index.ts#L36)*

**Parameters:**

Name | Type |
------ | ------ |
`_` | "apollo-engine" |
`options` | [ApolloEngineOptions](../interfaces/_loaders_apollo_engine_src_index_.apolloengineoptions) |

**Returns:** *Promise‹[Source](../interfaces/_utils_src_index_.source)›*

___

###  loadSync

▸ **loadSync**(): *never*

*Defined in [packages/loaders/apollo-engine/src/index.ts:69](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/apollo-engine/src/index.ts#L69)*

**Returns:** *never*

___

###  loaderId

▸ **loaderId**(): *string*

*Implementation of [Loader](../interfaces/_utils_src_index_.loader)*

*Defined in [packages/loaders/apollo-engine/src/index.ts:24](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/apollo-engine/src/index.ts#L24)*

**Returns:** *string*
