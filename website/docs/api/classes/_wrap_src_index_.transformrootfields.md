---
id: "_wrap_src_index_.transformrootfields"
title: "TransformRootFields"
sidebar_label: "TransformRootFields"
---

## Hierarchy

* **TransformRootFields**

## Implements

* [Transform](../interfaces/_utils_src_index_.transform)

## Index

### Constructors

* [constructor](_wrap_src_index_.transformrootfields.md#constructor)

### Methods

* [transformRequest](_wrap_src_index_.transformrootfields.md#transformrequest)
* [transformResult](_wrap_src_index_.transformrootfields.md#transformresult)
* [transformSchema](_wrap_src_index_.transformrootfields.md#transformschema)

## Constructors

###  constructor

\+ **new TransformRootFields**(`rootFieldTransformer`: [RootFieldTransformer](../modules/_wrap_src_index_.md#rootfieldtransformer), `fieldNodeTransformer?`: [FieldNodeTransformer](../modules/_wrap_src_index_.md#fieldnodetransformer)): *[TransformRootFields](_wrap_src_index_.transformrootfields)*

*Defined in [packages/wrap/src/transforms/TransformRootFields.ts:11](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformRootFields.ts#L11)*

**Parameters:**

Name | Type |
------ | ------ |
`rootFieldTransformer` | [RootFieldTransformer](../modules/_wrap_src_index_.md#rootfieldtransformer) |
`fieldNodeTransformer?` | [FieldNodeTransformer](../modules/_wrap_src_index_.md#fieldnodetransformer) |

**Returns:** *[TransformRootFields](_wrap_src_index_.transformrootfields)*

## Methods

###  transformRequest

▸ **transformRequest**(`originalRequest`: [Request](../interfaces/_utils_src_index_.request), `delegationContext?`: Record‹string, any›, `transformationContext?`: Record‹string, any›): *[Request](../interfaces/_utils_src_index_.request)*

*Defined in [packages/wrap/src/transforms/TransformRootFields.ts:48](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformRootFields.ts#L48)*

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

*Defined in [packages/wrap/src/transforms/TransformRootFields.ts:56](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformRootFields.ts#L56)*

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

*Defined in [packages/wrap/src/transforms/TransformRootFields.ts:18](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformRootFields.ts#L18)*

**Parameters:**

Name | Type |
------ | ------ |
`originalSchema` | GraphQLSchema |

**Returns:** *GraphQLSchema*
