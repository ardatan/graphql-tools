---
id: "_wrap_src_index_.mapfields"
title: "MapFields"
sidebar_label: "MapFields"
---

## Hierarchy

* **MapFields**

## Implements

* [Transform](/docs/api/interfaces/_utils_src_index_.transform)

## Index

### Constructors

* [constructor](_wrap_src_index_.mapfields.md#constructor)

### Methods

* [transformRequest](_wrap_src_index_.mapfields.md#transformrequest)
* [transformResult](_wrap_src_index_.mapfields.md#transformresult)
* [transformSchema](_wrap_src_index_.mapfields.md#transformschema)

## Constructors

###  constructor

\+ **new MapFields**(`fieldNodeTransformerMap`: [FieldNodeMappers](../modules/_utils_src_index_.md#fieldnodemappers), `objectValueTransformerMap?`: [ObjectValueTransformerMap](../modules/_wrap_src_index_.md#objectvaluetransformermap), `errorsTransformer?`: [ErrorsTransformer](../modules/_wrap_src_index_.md#errorstransformer)): *[MapFields](_wrap_src_index_.mapfields)*

*Defined in [packages/wrap/src/transforms/MapFields.ts:10](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/MapFields.ts#L10)*

**Parameters:**

Name | Type |
------ | ------ |
`fieldNodeTransformerMap` | [FieldNodeMappers](../modules/_utils_src_index_.md#fieldnodemappers) |
`objectValueTransformerMap?` | [ObjectValueTransformerMap](../modules/_wrap_src_index_.md#objectvaluetransformermap) |
`errorsTransformer?` | [ErrorsTransformer](../modules/_wrap_src_index_.md#errorstransformer) |

**Returns:** *[MapFields](_wrap_src_index_.mapfields)*

## Methods

###  transformRequest

▸ **transformRequest**(`originalRequest`: [Request](/docs/api/interfaces/_utils_src_index_.request), `delegationContext?`: Record‹string, any›, `transformationContext?`: Record‹string, any›): *[Request](/docs/api/interfaces/_utils_src_index_.request)*

*Defined in [packages/wrap/src/transforms/MapFields.ts:59](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/MapFields.ts#L59)*

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

*Defined in [packages/wrap/src/transforms/MapFields.ts:67](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/MapFields.ts#L67)*

**Parameters:**

Name | Type |
------ | ------ |
`originalResult` | [ExecutionResult](/docs/api/interfaces/_utils_src_index_.executionresult) |
`delegationContext?` | Record‹string, any› |
`transformationContext?` | Record‹string, any› |

**Returns:** *[ExecutionResult](/docs/api/interfaces/_utils_src_index_.executionresult)*

___

###  transformSchema

▸ **transformSchema**(`schema`: GraphQLSchema): *GraphQLSchema*

*Defined in [packages/wrap/src/transforms/MapFields.ts:55](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/MapFields.ts#L55)*

**Parameters:**

Name | Type |
------ | ------ |
`schema` | GraphQLSchema |

**Returns:** *GraphQLSchema*
