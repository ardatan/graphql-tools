---
id: "_loaders_module_src_index_.moduleloader"
title: "ModuleLoader"
sidebar_label: "ModuleLoader"
---

* This loader loads documents and type definitions from a Node module

```js
const schema = await loadSchema('module:someModuleName#someNamedExport', {
  loaders: [new ModuleLoader()],
})
```

## Hierarchy

* **ModuleLoader**

## Implements

* [Loader](/docs/api/interfaces/_utils_src_index_.loader)

## Index

### Methods

* [canLoad](_loaders_module_src_index_.moduleloader.md#canload)
* [canLoadSync](_loaders_module_src_index_.moduleloader.md#canloadsync)
* [load](_loaders_module_src_index_.moduleloader.md#load)
* [loadSync](_loaders_module_src_index_.moduleloader.md#loadsync)
* [loaderId](_loaders_module_src_index_.moduleloader.md#loaderid)

## Methods

###  canLoad

▸ **canLoad**(`pointer`: string): *Promise‹boolean›*

*Defined in [packages/loaders/module/src/index.ts:47](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/module/src/index.ts#L47)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | string |

**Returns:** *Promise‹boolean›*

___

###  canLoadSync

▸ **canLoadSync**(`pointer`: string): *boolean*

*Defined in [packages/loaders/module/src/index.ts:51](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/module/src/index.ts#L51)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | string |

**Returns:** *boolean*

___

###  load

▸ **load**(`pointer`: string, `options`: [SingleFileOptions](../modules/_utils_src_index_.md#singlefileoptions)): *Promise‹[Source](/docs/api/interfaces/_utils_src_index_.source)›*

*Defined in [packages/loaders/module/src/index.ts:55](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/module/src/index.ts#L55)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | string |
`options` | [SingleFileOptions](../modules/_utils_src_index_.md#singlefileoptions) |

**Returns:** *Promise‹[Source](/docs/api/interfaces/_utils_src_index_.source)›*

___

###  loadSync

▸ **loadSync**(`pointer`: string, `options`: [SingleFileOptions](../modules/_utils_src_index_.md#singlefileoptions)): *[Source](/docs/api/interfaces/_utils_src_index_.source)*

*Defined in [packages/loaders/module/src/index.ts:69](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/module/src/index.ts#L69)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | string |
`options` | [SingleFileOptions](../modules/_utils_src_index_.md#singlefileoptions) |

**Returns:** *[Source](/docs/api/interfaces/_utils_src_index_.source)*

___

###  loaderId

▸ **loaderId**(): *string*

*Implementation of [Loader](/docs/api/interfaces/_utils_src_index_.loader)*

*Defined in [packages/loaders/module/src/index.ts:43](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/module/src/index.ts#L43)*

**Returns:** *string*
