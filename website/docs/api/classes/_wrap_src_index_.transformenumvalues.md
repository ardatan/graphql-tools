---
id: "_wrap_src_index_.transformenumvalues"
title: "TransformEnumValues"
sidebar_label: "TransformEnumValues"
---

## Hierarchy

* **TransformEnumValues**

## Implements

* [Transform](/docs/api/interfaces/_utils_src_index_.transform)‹MapLeafValuesTransformationContext›

## Index

### Constructors

* [constructor](_wrap_src_index_.transformenumvalues.md#constructor)

### Methods

* [transformRequest](_wrap_src_index_.transformenumvalues.md#transformrequest)
* [transformResult](_wrap_src_index_.transformenumvalues.md#transformresult)
* [transformSchema](_wrap_src_index_.transformenumvalues.md#transformschema)

## Constructors

###  constructor

\+ **new TransformEnumValues**(`enumValueTransformer`: [EnumValueTransformer](../modules/_wrap_src_index_.md#enumvaluetransformer), `inputValueTransformer?`: [LeafValueTransformer](../modules/_wrap_src_index_.md#leafvaluetransformer), `outputValueTransformer?`: [LeafValueTransformer](../modules/_wrap_src_index_.md#leafvaluetransformer)): *[TransformEnumValues](_wrap_src_index_.transformenumvalues)*

*Defined in [packages/wrap/src/transforms/TransformEnumValues.ts:14](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformEnumValues.ts#L14)*

**Parameters:**

Name | Type |
------ | ------ |
`enumValueTransformer` | [EnumValueTransformer](../modules/_wrap_src_index_.md#enumvaluetransformer) |
`inputValueTransformer?` | [LeafValueTransformer](../modules/_wrap_src_index_.md#leafvaluetransformer) |
`outputValueTransformer?` | [LeafValueTransformer](../modules/_wrap_src_index_.md#leafvaluetransformer) |

**Returns:** *[TransformEnumValues](_wrap_src_index_.transformenumvalues)*

## Methods

###  transformRequest

▸ **transformRequest**(`originalRequest`: [Request](/docs/api/interfaces/_utils_src_index_.request), `delegationContext?`: Record‹string, any›, `transformationContext?`: MapLeafValuesTransformationContext): *[Request](/docs/api/interfaces/_utils_src_index_.request)*

*Defined in [packages/wrap/src/transforms/TransformEnumValues.ts:39](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformEnumValues.ts#L39)*

**Parameters:**

Name | Type |
------ | ------ |
`originalRequest` | [Request](/docs/api/interfaces/_utils_src_index_.request) |
`delegationContext?` | Record‹string, any› |
`transformationContext?` | MapLeafValuesTransformationContext |

**Returns:** *[Request](/docs/api/interfaces/_utils_src_index_.request)*

___

###  transformResult

▸ **transformResult**(`originalResult`: ExecutionResult, `delegationContext?`: Record‹string, any›, `transformationContext?`: MapLeafValuesTransformationContext): *any*

*Defined in [packages/wrap/src/transforms/TransformEnumValues.ts:47](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformEnumValues.ts#L47)*

**Parameters:**

Name | Type |
------ | ------ |
`originalResult` | ExecutionResult |
`delegationContext?` | Record‹string, any› |
`transformationContext?` | MapLeafValuesTransformationContext |

**Returns:** *any*

___

###  transformSchema

▸ **transformSchema**(`originalSchema`: GraphQLSchema): *GraphQLSchema*

*Defined in [packages/wrap/src/transforms/TransformEnumValues.ts:30](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformEnumValues.ts#L30)*

**Parameters:**

Name | Type |
------ | ------ |
`originalSchema` | GraphQLSchema |

**Returns:** *GraphQLSchema*
