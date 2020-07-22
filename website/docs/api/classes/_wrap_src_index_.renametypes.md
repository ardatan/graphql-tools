---
id: "_wrap_src_index_.renametypes"
title: "RenameTypes"
sidebar_label: "RenameTypes"
---

## Hierarchy

* **RenameTypes**

## Implements

* [Transform](/docs/api/interfaces/_utils_src_index_.transform)

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

*Defined in [packages/wrap/src/transforms/RenameTypes.ts:27](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameTypes.ts#L27)*

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

▸ **transformRequest**(`originalRequest`: [Request](/docs/api/interfaces/_utils_src_index_.request)): *[Request](/docs/api/interfaces/_utils_src_index_.request)*

*Defined in [packages/wrap/src/transforms/RenameTypes.ts:63](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameTypes.ts#L63)*

**Parameters:**

Name | Type |
------ | ------ |
`originalRequest` | [Request](/docs/api/interfaces/_utils_src_index_.request) |

**Returns:** *[Request](/docs/api/interfaces/_utils_src_index_.request)*

___

###  transformResult

▸ **transformResult**(`result`: [ExecutionResult](/docs/api/interfaces/_utils_src_index_.executionresult)): *[ExecutionResult](/docs/api/interfaces/_utils_src_index_.executionresult)*

*Defined in [packages/wrap/src/transforms/RenameTypes.ts:85](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameTypes.ts#L85)*

**Parameters:**

Name | Type |
------ | ------ |
`result` | [ExecutionResult](/docs/api/interfaces/_utils_src_index_.executionresult) |

**Returns:** *[ExecutionResult](/docs/api/interfaces/_utils_src_index_.executionresult)*

___

###  transformSchema

▸ **transformSchema**(`originalSchema`: GraphQLSchema): *GraphQLSchema*

*Defined in [packages/wrap/src/transforms/RenameTypes.ts:38](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameTypes.ts#L38)*

**Parameters:**

Name | Type |
------ | ------ |
`originalSchema` | GraphQLSchema |

**Returns:** *GraphQLSchema*
