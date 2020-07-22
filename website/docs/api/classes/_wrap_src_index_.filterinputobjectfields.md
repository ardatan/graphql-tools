---
id: "_wrap_src_index_.filterinputobjectfields"
title: "FilterInputObjectFields"
sidebar_label: "FilterInputObjectFields"
---

## Hierarchy

* **FilterInputObjectFields**

## Implements

* [Transform](/docs/api/interfaces/_utils_src_index_.transform)

## Index

### Constructors

* [constructor](_wrap_src_index_.filterinputobjectfields.md#constructor)

### Methods

* [transformRequest](_wrap_src_index_.filterinputobjectfields.md#transformrequest)
* [transformSchema](_wrap_src_index_.filterinputobjectfields.md#transformschema)

## Constructors

###  constructor

\+ **new FilterInputObjectFields**(`filter`: [InputFieldFilter](../modules/_utils_src_index_.md#inputfieldfilter), `inputObjectNodeTransformer?`: [InputObjectNodeTransformer](../modules/_wrap_src_index_.md#inputobjectnodetransformer)): *[FilterInputObjectFields](_wrap_src_index_.filterinputobjectfields)*

*Defined in [packages/wrap/src/transforms/FilterInputObjectFields.ts:9](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/FilterInputObjectFields.ts#L9)*

**Parameters:**

Name | Type |
------ | ------ |
`filter` | [InputFieldFilter](../modules/_utils_src_index_.md#inputfieldfilter) |
`inputObjectNodeTransformer?` | [InputObjectNodeTransformer](../modules/_wrap_src_index_.md#inputobjectnodetransformer) |

**Returns:** *[FilterInputObjectFields](_wrap_src_index_.filterinputobjectfields)*

## Methods

###  transformRequest

▸ **transformRequest**(`originalRequest`: [Request](/docs/api/interfaces/_utils_src_index_.request), `delegationContext?`: Record‹string, any›): *[Request](/docs/api/interfaces/_utils_src_index_.request)*

*Defined in [packages/wrap/src/transforms/FilterInputObjectFields.ts:24](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/FilterInputObjectFields.ts#L24)*

**Parameters:**

Name | Type |
------ | ------ |
`originalRequest` | [Request](/docs/api/interfaces/_utils_src_index_.request) |
`delegationContext?` | Record‹string, any› |

**Returns:** *[Request](/docs/api/interfaces/_utils_src_index_.request)*

___

###  transformSchema

▸ **transformSchema**(`originalSchema`: GraphQLSchema): *GraphQLSchema*

*Defined in [packages/wrap/src/transforms/FilterInputObjectFields.ts:20](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/FilterInputObjectFields.ts#L20)*

**Parameters:**

Name | Type |
------ | ------ |
`originalSchema` | GraphQLSchema |

**Returns:** *GraphQLSchema*
