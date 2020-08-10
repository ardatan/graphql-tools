---
id: "_load_files_src_index_"
title: "load-files/src/index"
sidebar_label: "load-files/src/index"
---

## Index

### Interfaces

* [LoadFilesOptions](../interfaces/_load_files_src_index_.loadfilesoptions.md)

### Functions

* [loadFiles](_load_files_src_index_.md#loadfiles)
* [loadFilesSync](_load_files_src_index_.md#loadfilessync)

## Functions

###  loadFiles

▸ **loadFiles**(`pattern`: string | string[], `options`: [LoadFilesOptions](../interfaces/_load_files_src_index_.loadfilesoptions.md)): *Promise‹any[]›*

*Defined in [packages/load-files/src/index.ts:212](https://github.com/ardatan/graphql-tools/blob/master/packages/load-files/src/index.ts#L212)*

Asynchronously loads files using the provided glob pattern.

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`pattern` | string &#124; string[] | - | Glob pattern or patterns to use when loading files |
`options` | [LoadFilesOptions](../interfaces/_load_files_src_index_.loadfilesoptions.md) | LoadFilesDefaultOptions | Additional options  |

**Returns:** *Promise‹any[]›*

___

###  loadFilesSync

▸ **loadFilesSync**‹**T**›(`pattern`: string | string[], `options`: [LoadFilesOptions](../interfaces/_load_files_src_index_.loadfilesoptions.md)): *T[]*

*Defined in [packages/load-files/src/index.ts:116](https://github.com/ardatan/graphql-tools/blob/master/packages/load-files/src/index.ts#L116)*

Synchronously loads files using the provided glob pattern.

**Type parameters:**

▪ **T**

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`pattern` | string &#124; string[] | - | Glob pattern or patterns to use when loading files |
`options` | [LoadFilesOptions](../interfaces/_load_files_src_index_.loadfilesoptions.md) | LoadFilesDefaultOptions | Additional options  |

**Returns:** *T[]*
