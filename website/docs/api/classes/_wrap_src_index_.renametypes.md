---
id: "_wrap_src_index_.renametypes"
title: "RenameTypes"
sidebar_label: "RenameTypes"
---

## Hierarchy

* **RenameTypes**

## Implements

* [Transform](../interfaces/_utils_src_index_.transform)

## Index

### Constructors

* [constructor](_wrap_src_index_.renametypes.md#constructor)

### Methods

* [transformRequest](_wrap_src_index_.renametypes.md#transformrequest)
* [transformResult](_wrap_src_index_.renametypes.md#transformresult)
* [transformSchema](_wrap_src_index_.renametypes.md#transformschema)

## Constructors

###  constructor

\+ **new RenameTypes**(`renamer`: function, `options?`: [RenameTypesOptions](../modules/_utils_src_index_.md#renametypesoptions)): *[RenameTypes](_wrap_src_index_.renametypes)*

*Defined in [packages/wrap/src/transforms/RenameTypes.ts:37](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameTypes.ts#L37)*

**Parameters:**

▪ **renamer**: *function*

▸ (`name`: string): *string | undefined*

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |

▪`Optional`  **options**: *[RenameTypesOptions](../modules/_utils_src_index_.md#renametypesoptions)*

**Returns:** *[RenameTypes](_wrap_src_index_.renametypes)*

## Methods

###  transformRequest

▸ **transformRequest**(`originalRequest`: [Request](../interfaces/_utils_src_index_.request)): *[Request](../interfaces/_utils_src_index_.request)*

*Defined in [packages/wrap/src/transforms/RenameTypes.ts:105](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameTypes.ts#L105)*

**Parameters:**

Name | Type |
------ | ------ |
`originalRequest` | [Request](../interfaces/_utils_src_index_.request) |

**Returns:** *[Request](../interfaces/_utils_src_index_.request)*

___

###  transformResult

▸ **transformResult**(`result`: [ExecutionResult](../interfaces/_utils_src_index_.executionresult)): *[ExecutionResult](../interfaces/_utils_src_index_.executionresult)*

*Defined in [packages/wrap/src/transforms/RenameTypes.ts:127](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameTypes.ts#L127)*

**Parameters:**

Name | Type |
------ | ------ |
`result` | [ExecutionResult](../interfaces/_utils_src_index_.executionresult) |

**Returns:** *[ExecutionResult](../interfaces/_utils_src_index_.executionresult)*

___

###  transformSchema

▸ **transformSchema**(`originalSchema`: GraphQLSchema): *GraphQLSchema*

*Defined in [packages/wrap/src/transforms/RenameTypes.ts:48](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameTypes.ts#L48)*

**Parameters:**

Name | Type |
------ | ------ |
`originalSchema` | GraphQLSchema |

**Returns:** *GraphQLSchema*
