---
id: "_wrap_src_index_.mapleafvalues"
title: "MapLeafValues"
sidebar_label: "MapLeafValues"
---

## Hierarchy

* **MapLeafValues**

## Implements

* [Transform](/docs/api/interfaces/_utils_src_index_.transform)‹MapLeafValuesTransformationContext›

## Index

### Constructors

* [constructor](_wrap_src_index_.mapleafvalues.md#constructor)

### Methods

* [transformRequest](_wrap_src_index_.mapleafvalues.md#transformrequest)
* [transformResult](_wrap_src_index_.mapleafvalues.md#transformresult)
* [transformSchema](_wrap_src_index_.mapleafvalues.md#transformschema)

## Constructors

###  constructor

\+ **new MapLeafValues**(`inputValueTransformer`: [LeafValueTransformer](../modules/_wrap_src_index_.md#leafvaluetransformer), `outputValueTransformer`: [LeafValueTransformer](../modules/_wrap_src_index_.md#leafvaluetransformer)): *[MapLeafValues](_wrap_src_index_.mapleafvalues)*

*Defined in [packages/wrap/src/transforms/MapLeafValues.ts:38](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/MapLeafValues.ts#L38)*

**Parameters:**

Name | Type |
------ | ------ |
`inputValueTransformer` | [LeafValueTransformer](../modules/_wrap_src_index_.md#leafvaluetransformer) |
`outputValueTransformer` | [LeafValueTransformer](../modules/_wrap_src_index_.md#leafvaluetransformer) |

**Returns:** *[MapLeafValues](_wrap_src_index_.mapleafvalues)*

## Methods

###  transformRequest

▸ **transformRequest**(`originalRequest`: [Request](/docs/api/interfaces/_utils_src_index_.request), `_delegationContext?`: Record‹string, any›, `transformationContext?`: MapLeafValuesTransformationContext): *[Request](/docs/api/interfaces/_utils_src_index_.request)*

*Defined in [packages/wrap/src/transforms/MapLeafValues.ts:61](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/MapLeafValues.ts#L61)*

**Parameters:**

Name | Type |
------ | ------ |
`originalRequest` | [Request](/docs/api/interfaces/_utils_src_index_.request) |
`_delegationContext?` | Record‹string, any› |
`transformationContext?` | MapLeafValuesTransformationContext |

**Returns:** *[Request](/docs/api/interfaces/_utils_src_index_.request)*

___

###  transformResult

▸ **transformResult**(`originalResult`: [ExecutionResult](/docs/api/interfaces/_utils_src_index_.executionresult), `_delegationContext?`: Record‹string, any›, `transformationContext?`: MapLeafValuesTransformationContext): *any*

*Defined in [packages/wrap/src/transforms/MapLeafValues.ts:92](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/MapLeafValues.ts#L92)*

**Parameters:**

Name | Type |
------ | ------ |
`originalResult` | [ExecutionResult](/docs/api/interfaces/_utils_src_index_.executionresult) |
`_delegationContext?` | Record‹string, any› |
`transformationContext?` | MapLeafValuesTransformationContext |

**Returns:** *any*

___

###  transformSchema

▸ **transformSchema**(`originalSchema`: GraphQLSchema): *GraphQLSchema*

*Defined in [packages/wrap/src/transforms/MapLeafValues.ts:46](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/MapLeafValues.ts#L46)*

**Parameters:**

Name | Type |
------ | ------ |
`originalSchema` | GraphQLSchema |

**Returns:** *GraphQLSchema*
