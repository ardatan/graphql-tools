---
id: "_wrap_src_index_.transformquery"
title: "TransformQuery"
sidebar_label: "TransformQuery"
---

## Hierarchy

* **TransformQuery**

## Implements

* [Transform](../interfaces/_utils_src_index_.transform)

## Index

### Constructors

* [constructor](_wrap_src_index_.transformquery.md#constructor)

### Methods

* [transformRequest](_wrap_src_index_.transformquery.md#transformrequest)
* [transformResult](_wrap_src_index_.transformquery.md#transformresult)

## Constructors

###  constructor

\+ **new TransformQuery**(`__namedParameters`: object): *[TransformQuery](_wrap_src_index_.transformquery)*

*Defined in [packages/wrap/src/transforms/TransformQuery.ts:19](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformQuery.ts#L19)*

**Parameters:**

▪ **__namedParameters**: *object*

Name | Type |
------ | ------ |
`fragments` | object |
`path` | string[] |
`queryTransformer` | function |
`errorPathTransformer` |  |
`resultTransformer` |  |

**Returns:** *[TransformQuery](_wrap_src_index_.transformquery)*

## Methods

###  transformRequest

▸ **transformRequest**(`originalRequest`: [Request](../interfaces/_utils_src_index_.request)): *[Request](../interfaces/_utils_src_index_.request)*

*Defined in [packages/wrap/src/transforms/TransformQuery.ts:41](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformQuery.ts#L41)*

**Parameters:**

Name | Type |
------ | ------ |
`originalRequest` | [Request](../interfaces/_utils_src_index_.request) |

**Returns:** *[Request](../interfaces/_utils_src_index_.request)*

___

###  transformResult

▸ **transformResult**(`originalResult`: [ExecutionResult](../interfaces/_utils_src_index_.executionresult)): *[ExecutionResult](../interfaces/_utils_src_index_.executionresult)*

*Defined in [packages/wrap/src/transforms/TransformQuery.ts:74](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformQuery.ts#L74)*

**Parameters:**

Name | Type |
------ | ------ |
`originalResult` | [ExecutionResult](../interfaces/_utils_src_index_.executionresult) |

**Returns:** *[ExecutionResult](../interfaces/_utils_src_index_.executionresult)*
