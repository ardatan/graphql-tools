---
id: "load-files"
title: "@graphql-tools/load-files"
sidebar_label: "load-files"
---

### Interfaces

* [LoadFilesOptions](/docs/api/interfaces/_load_files_src_index_.loadfilesoptions)

### Functions

* [loadFiles](_load_files_src_index_.md#loadfiles)
* [loadFilesSync](_load_files_src_index_.md#loadfilessync)

## Functions

###  loadFiles

▸ **loadFiles**(`pattern`: string | string[], `options`: [LoadFilesOptions](/docs/api/interfaces/_load_files_src_index_.loadfilesoptions)): *Promise‹any[]›*

*Defined in [packages/load-files/src/index.ts:212](https://github.com/ardatan/graphql-tools/blob/master/packages/load-files/src/index.ts#L212)*

Asynchronously loads files using the provided glob pattern.

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`pattern` | string &#124; string[] | - | Glob pattern or patterns to use when loading files |
`options` | [LoadFilesOptions](/docs/api/interfaces/_load_files_src_index_.loadfilesoptions) | LoadFilesDefaultOptions | Additional options  |

**Returns:** *Promise‹any[]›*

___

###  loadFilesSync

▸ **loadFilesSync**‹**T**›(`pattern`: string | string[], `options`: [LoadFilesOptions](/docs/api/interfaces/_load_files_src_index_.loadfilesoptions)): *T[]*

*Defined in [packages/load-files/src/index.ts:116](https://github.com/ardatan/graphql-tools/blob/master/packages/load-files/src/index.ts#L116)*

Synchronously loads files using the provided glob pattern.

**Type parameters:**

▪ **T**

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`pattern` | string &#124; string[] | - | Glob pattern or patterns to use when loading files |
`options` | [LoadFilesOptions](/docs/api/interfaces/_load_files_src_index_.loadfilesoptions) | LoadFilesDefaultOptions | Additional options  |

**Returns:** *T[]*
