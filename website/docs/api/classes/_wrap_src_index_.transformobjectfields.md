---
id: "_wrap_src_index_.transformobjectfields"
title: "TransformObjectFields"
sidebar_label: "TransformObjectFields"
---

## Hierarchy

* **TransformObjectFields**

## Implements

* [Transform](/docs/api/interfaces/_utils_src_index_.transform)

## Index

### Constructors

* [constructor](_wrap_src_index_.transformobjectfields.md#constructor)

### Methods

* [transformRequest](_wrap_src_index_.transformobjectfields.md#transformrequest)
* [transformResult](_wrap_src_index_.transformobjectfields.md#transformresult)
* [transformSchema](_wrap_src_index_.transformobjectfields.md#transformschema)

## Constructors

###  constructor

\+ **new TransformObjectFields**(`objectFieldTransformer`: [FieldTransformer](../modules/_wrap_src_index_.md#fieldtransformer), `fieldNodeTransformer?`: [FieldNodeTransformer](../modules/_wrap_src_index_.md#fieldnodetransformer)): *[TransformObjectFields](_wrap_src_index_.transformobjectfields)*

*Defined in [packages/wrap/src/transforms/TransformObjectFields.ts:11](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformObjectFields.ts#L11)*

**Parameters:**

Name | Type |
------ | ------ |
`objectFieldTransformer` | [FieldTransformer](../modules/_wrap_src_index_.md#fieldtransformer) |
`fieldNodeTransformer?` | [FieldNodeTransformer](../modules/_wrap_src_index_.md#fieldnodetransformer) |

**Returns:** *[TransformObjectFields](_wrap_src_index_.transformobjectfields)*

## Methods

###  transformRequest

▸ **transformRequest**(`originalRequest`: [Request](/docs/api/interfaces/_utils_src_index_.request), `delegationContext?`: Record‹string, any›, `transformationContext?`: Record‹string, any›): *[Request](/docs/api/interfaces/_utils_src_index_.request)*

*Defined in [packages/wrap/src/transforms/TransformObjectFields.ts:36](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformObjectFields.ts#L36)*

**Parameters:**

Name | Type |
------ | ------ |
`originalRequest` | [Request](/docs/api/interfaces/_utils_src_index_.request) |
`delegationContext?` | Record‹string, any› |
`transformationContext?` | Record‹string, any› |

**Returns:** *[Request](/docs/api/interfaces/_utils_src_index_.request)*

___

###  transformResult

▸ **transformResult**(`originalResult`: [ExecutionResult](/docs/api/interfaces/_utils_src_index_.executionresult), `delegationContext?`: Record‹string, any›, `transformationContext?`: Record‹string, any›): *[ExecutionResult](/docs/api/interfaces/_utils_src_index_.executionresult)*

*Defined in [packages/wrap/src/transforms/TransformObjectFields.ts:44](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformObjectFields.ts#L44)*

**Parameters:**

Name | Type |
------ | ------ |
`originalResult` | [ExecutionResult](/docs/api/interfaces/_utils_src_index_.executionresult) |
`delegationContext?` | Record‹string, any› |
`transformationContext?` | Record‹string, any› |

**Returns:** *[ExecutionResult](/docs/api/interfaces/_utils_src_index_.executionresult)*

___

###  transformSchema

▸ **transformSchema**(`originalSchema`: GraphQLSchema): *GraphQLSchema*

*Defined in [packages/wrap/src/transforms/TransformObjectFields.ts:18](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformObjectFields.ts#L18)*

**Parameters:**

Name | Type |
------ | ------ |
`originalSchema` | GraphQLSchema |

**Returns:** *GraphQLSchema*
