---
id: "_wrap_src_index_.transformcompositefields"
title: "TransformCompositeFields"
sidebar_label: "TransformCompositeFields"
---

## Hierarchy

* **TransformCompositeFields**

## Implements

* [Transform](../interfaces/_utils_src_index_.transform)

## Index

### Constructors

* [constructor](_wrap_src_index_.transformcompositefields.md#constructor)

### Methods

* [transformRequest](_wrap_src_index_.transformcompositefields.md#transformrequest)
* [transformResult](_wrap_src_index_.transformcompositefields.md#transformresult)
* [transformSchema](_wrap_src_index_.transformcompositefields.md#transformschema)

## Constructors

###  constructor

\+ **new TransformCompositeFields**(`fieldTransformer`: [FieldTransformer](../modules/_wrap_src_index_.md#fieldtransformer), `fieldNodeTransformer?`: [FieldNodeTransformer](../modules/_wrap_src_index_.md#fieldnodetransformer), `dataTransformer?`: [DataTransformer](../modules/_wrap_src_index_.md#datatransformer), `errorsTransformer?`: [ErrorsTransformer](../modules/_wrap_src_index_.md#errorstransformer)): *[TransformCompositeFields](_wrap_src_index_.transformcompositefields)*

*Defined in [packages/wrap/src/transforms/TransformCompositeFields.ts:28](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformCompositeFields.ts#L28)*

**Parameters:**

Name | Type |
------ | ------ |
`fieldTransformer` | [FieldTransformer](../modules/_wrap_src_index_.md#fieldtransformer) |
`fieldNodeTransformer?` | [FieldNodeTransformer](../modules/_wrap_src_index_.md#fieldnodetransformer) |
`dataTransformer?` | [DataTransformer](../modules/_wrap_src_index_.md#datatransformer) |
`errorsTransformer?` | [ErrorsTransformer](../modules/_wrap_src_index_.md#errorstransformer) |

**Returns:** *[TransformCompositeFields](_wrap_src_index_.transformcompositefields)*

## Methods

###  transformRequest

▸ **transformRequest**(`originalRequest`: [Request](../interfaces/_utils_src_index_.request), `_delegationContext?`: Record‹string, any›, `transformationContext?`: Record‹string, any›): *[Request](../interfaces/_utils_src_index_.request)*

*Defined in [packages/wrap/src/transforms/TransformCompositeFields.ts:53](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformCompositeFields.ts#L53)*

**Parameters:**

Name | Type |
------ | ------ |
`originalRequest` | [Request](../interfaces/_utils_src_index_.request) |
`_delegationContext?` | Record‹string, any› |
`transformationContext?` | Record‹string, any› |

**Returns:** *[Request](../interfaces/_utils_src_index_.request)*

___

###  transformResult

▸ **transformResult**(`result`: [ExecutionResult](../interfaces/_utils_src_index_.executionresult), `_delegationContext?`: Record‹string, any›, `transformationContext?`: Record‹string, any›): *[ExecutionResult](../interfaces/_utils_src_index_.executionresult)‹object›*

*Defined in [packages/wrap/src/transforms/TransformCompositeFields.ts:71](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformCompositeFields.ts#L71)*

**Parameters:**

Name | Type |
------ | ------ |
`result` | [ExecutionResult](../interfaces/_utils_src_index_.executionresult) |
`_delegationContext?` | Record‹string, any› |
`transformationContext?` | Record‹string, any› |

**Returns:** *[ExecutionResult](../interfaces/_utils_src_index_.executionresult)‹object›*

___

###  transformSchema

▸ **transformSchema**(`originalSchema`: GraphQLSchema): *GraphQLSchema*

*Defined in [packages/wrap/src/transforms/TransformCompositeFields.ts:43](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformCompositeFields.ts#L43)*

**Parameters:**

Name | Type |
------ | ------ |
`originalSchema` | GraphQLSchema |

**Returns:** *GraphQLSchema*
