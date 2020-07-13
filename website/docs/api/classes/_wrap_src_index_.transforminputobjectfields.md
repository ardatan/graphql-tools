---
id: "_wrap_src_index_.transforminputobjectfields"
title: "TransformInputObjectFields"
sidebar_label: "TransformInputObjectFields"
---

## Hierarchy

* **TransformInputObjectFields**

## Implements

* [Transform](../interfaces/_utils_src_index_.transform)

## Index

### Constructors

* [constructor](_wrap_src_index_.transforminputobjectfields.md#constructor)

### Methods

* [transformRequest](_wrap_src_index_.transforminputobjectfields.md#transformrequest)
* [transformSchema](_wrap_src_index_.transforminputobjectfields.md#transformschema)

## Constructors

###  constructor

\+ **new TransformInputObjectFields**(`inputFieldTransformer`: [InputFieldTransformer](../modules/_wrap_src_index_.md#inputfieldtransformer), `inputFieldNodeTransformer?`: [InputFieldNodeTransformer](../modules/_wrap_src_index_.md#inputfieldnodetransformer), `inputObjectNodeTransformer?`: [InputObjectNodeTransformer](../modules/_wrap_src_index_.md#inputobjectnodetransformer)): *[TransformInputObjectFields](_wrap_src_index_.transforminputobjectfields)*

*Defined in [packages/wrap/src/transforms/TransformInputObjectFields.ts:24](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformInputObjectFields.ts#L24)*

**Parameters:**

Name | Type |
------ | ------ |
`inputFieldTransformer` | [InputFieldTransformer](../modules/_wrap_src_index_.md#inputfieldtransformer) |
`inputFieldNodeTransformer?` | [InputFieldNodeTransformer](../modules/_wrap_src_index_.md#inputfieldnodetransformer) |
`inputObjectNodeTransformer?` | [InputObjectNodeTransformer](../modules/_wrap_src_index_.md#inputobjectnodetransformer) |

**Returns:** *[TransformInputObjectFields](_wrap_src_index_.transforminputobjectfields)*

## Methods

###  transformRequest

▸ **transformRequest**(`originalRequest`: [Request](../interfaces/_utils_src_index_.request), `delegationContext?`: Record‹string, any›): *[Request](../interfaces/_utils_src_index_.request)*

*Defined in [packages/wrap/src/transforms/TransformInputObjectFields.ts:46](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformInputObjectFields.ts#L46)*

**Parameters:**

Name | Type |
------ | ------ |
`originalRequest` | [Request](../interfaces/_utils_src_index_.request) |
`delegationContext?` | Record‹string, any› |

**Returns:** *[Request](../interfaces/_utils_src_index_.request)*

___

###  transformSchema

▸ **transformSchema**(`originalSchema`: GraphQLSchema): *GraphQLSchema*

*Defined in [packages/wrap/src/transforms/TransformInputObjectFields.ts:37](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformInputObjectFields.ts#L37)*

**Parameters:**

Name | Type |
------ | ------ |
`originalSchema` | GraphQLSchema |

**Returns:** *GraphQLSchema*
