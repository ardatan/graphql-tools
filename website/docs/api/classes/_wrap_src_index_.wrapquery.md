---
id: "_wrap_src_index_.wrapquery"
title: "WrapQuery"
sidebar_label: "WrapQuery"
---

## Hierarchy

* **WrapQuery**

## Implements

* [Transform](/docs/api/interfaces/_utils_src_index_.transform)

## Index

### Constructors

* [constructor](_wrap_src_index_.wrapquery.md#constructor)

### Methods

* [transformRequest](_wrap_src_index_.wrapquery.md#transformrequest)
* [transformResult](_wrap_src_index_.wrapquery.md#transformresult)

## Constructors

###  constructor

\+ **new WrapQuery**(`path`: Array‹string›, `wrapper`: QueryWrapper, `extractor`: function): *[WrapQuery](_wrap_src_index_.wrapquery)*

*Defined in [packages/wrap/src/transforms/WrapQuery.ts:10](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/WrapQuery.ts#L10)*

**Parameters:**

▪ **path**: *Array‹string›*

▪ **wrapper**: *QueryWrapper*

▪ **extractor**: *function*

▸ (`result`: any): *any*

**Parameters:**

Name | Type |
------ | ------ |
`result` | any |

**Returns:** *[WrapQuery](_wrap_src_index_.wrapquery)*

## Methods

###  transformRequest

▸ **transformRequest**(`originalRequest`: [Request](/docs/api/interfaces/_utils_src_index_.request)): *[Request](/docs/api/interfaces/_utils_src_index_.request)*

*Defined in [packages/wrap/src/transforms/WrapQuery.ts:18](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/WrapQuery.ts#L18)*

**Parameters:**

Name | Type |
------ | ------ |
`originalRequest` | [Request](/docs/api/interfaces/_utils_src_index_.request) |

**Returns:** *[Request](/docs/api/interfaces/_utils_src_index_.request)*

___

###  transformResult

▸ **transformResult**(`originalResult`: [ExecutionResult](/docs/api/interfaces/_utils_src_index_.executionresult)): *[ExecutionResult](/docs/api/interfaces/_utils_src_index_.executionresult)*

*Defined in [packages/wrap/src/transforms/WrapQuery.ts:55](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/WrapQuery.ts#L55)*

**Parameters:**

Name | Type |
------ | ------ |
`originalResult` | [ExecutionResult](/docs/api/interfaces/_utils_src_index_.executionresult) |

**Returns:** *[ExecutionResult](/docs/api/interfaces/_utils_src_index_.executionresult)*
