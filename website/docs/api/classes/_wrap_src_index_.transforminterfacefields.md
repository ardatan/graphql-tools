---
id: "_wrap_src_index_.transforminterfacefields"
title: "TransformInterfaceFields"
sidebar_label: "TransformInterfaceFields"
---

## Hierarchy

* **TransformInterfaceFields**

## Implements

* [Transform](../interfaces/_utils_src_index_.transform)

## Index

### Constructors

* [constructor](_wrap_src_index_.transforminterfacefields.md#constructor)

### Methods

* [transformRequest](_wrap_src_index_.transforminterfacefields.md#transformrequest)
* [transformResult](_wrap_src_index_.transforminterfacefields.md#transformresult)
* [transformSchema](_wrap_src_index_.transforminterfacefields.md#transformschema)

## Constructors

###  constructor

\+ **new TransformInterfaceFields**(`interfaceFieldTransformer`: [FieldTransformer](../modules/_wrap_src_index_.md#fieldtransformer), `fieldNodeTransformer?`: [FieldNodeTransformer](../modules/_wrap_src_index_.md#fieldnodetransformer)): *[TransformInterfaceFields](_wrap_src_index_.transforminterfacefields)*

*Defined in [packages/wrap/src/transforms/TransformInterfaceFields.ts:11](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformInterfaceFields.ts#L11)*

**Parameters:**

Name | Type |
------ | ------ |
`interfaceFieldTransformer` | [FieldTransformer](../modules/_wrap_src_index_.md#fieldtransformer) |
`fieldNodeTransformer?` | [FieldNodeTransformer](../modules/_wrap_src_index_.md#fieldnodetransformer) |

**Returns:** *[TransformInterfaceFields](_wrap_src_index_.transforminterfacefields)*

## Methods

###  transformRequest

▸ **transformRequest**(`originalRequest`: [Request](../interfaces/_utils_src_index_.request), `delegationContext?`: Record‹string, any›, `transformationContext?`: Record‹string, any›): *[Request](../interfaces/_utils_src_index_.request)*

*Defined in [packages/wrap/src/transforms/TransformInterfaceFields.ts:36](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformInterfaceFields.ts#L36)*

**Parameters:**

Name | Type |
------ | ------ |
`originalRequest` | [Request](../interfaces/_utils_src_index_.request) |
`delegationContext?` | Record‹string, any› |
`transformationContext?` | Record‹string, any› |

**Returns:** *[Request](../interfaces/_utils_src_index_.request)*

___

###  transformResult

▸ **transformResult**(`originalResult`: [ExecutionResult](../interfaces/_utils_src_index_.executionresult), `delegationContext?`: Record‹string, any›, `transformationContext?`: Record‹string, any›): *[ExecutionResult](../interfaces/_utils_src_index_.executionresult)*

*Defined in [packages/wrap/src/transforms/TransformInterfaceFields.ts:44](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformInterfaceFields.ts#L44)*

**Parameters:**

Name | Type |
------ | ------ |
`originalResult` | [ExecutionResult](../interfaces/_utils_src_index_.executionresult) |
`delegationContext?` | Record‹string, any› |
`transformationContext?` | Record‹string, any› |

**Returns:** *[ExecutionResult](../interfaces/_utils_src_index_.executionresult)*

___

###  transformSchema

▸ **transformSchema**(`originalSchema`: GraphQLSchema): *GraphQLSchema*

*Defined in [packages/wrap/src/transforms/TransformInterfaceFields.ts:18](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformInterfaceFields.ts#L18)*

**Parameters:**

Name | Type |
------ | ------ |
`originalSchema` | GraphQLSchema |

**Returns:** *GraphQLSchema*
