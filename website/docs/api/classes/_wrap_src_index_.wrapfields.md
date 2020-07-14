---
id: "_wrap_src_index_.wrapfields"
title: "WrapFields"
sidebar_label: "WrapFields"
---

## Hierarchy

* **WrapFields**

## Implements

* [Transform](../interfaces/_utils_src_index_.transform)

## Index

### Constructors

* [constructor](_wrap_src_index_.wrapfields.md#constructor)

### Methods

* [transformRequest](_wrap_src_index_.wrapfields.md#transformrequest)
* [transformResult](_wrap_src_index_.wrapfields.md#transformresult)
* [transformSchema](_wrap_src_index_.wrapfields.md#transformschema)

## Constructors

###  constructor

\+ **new WrapFields**(`outerTypeName`: string, `wrappingFieldNames`: Array‹string›, `wrappingTypeNames`: Array‹string›, `fieldNames?`: Array‹string›, `wrappingResolver`: GraphQLFieldResolver‹any, any›, `prefix`: string): *[WrapFields](_wrap_src_index_.wrapfields)*

*Defined in [packages/wrap/src/transforms/WrapFields.ts:52](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/WrapFields.ts#L52)*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`outerTypeName` | string | - |
`wrappingFieldNames` | Array‹string› | - |
`wrappingTypeNames` | Array‹string› | - |
`fieldNames?` | Array‹string› | - |
`wrappingResolver` | GraphQLFieldResolver‹any, any› | defaultWrappingResolver |
`prefix` | string | "gqtld" |

**Returns:** *[WrapFields](_wrap_src_index_.wrapfields)*

## Methods

###  transformRequest

▸ **transformRequest**(`originalRequest`: [Request](../interfaces/_utils_src_index_.request), `delegationContext`: Record‹string, any›, `transformationContext`: WrapFieldsTransformationContext): *[Request](../interfaces/_utils_src_index_.request)*

*Defined in [packages/wrap/src/transforms/WrapFields.ts:139](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/WrapFields.ts#L139)*

**Parameters:**

Name | Type |
------ | ------ |
`originalRequest` | [Request](../interfaces/_utils_src_index_.request) |
`delegationContext` | Record‹string, any› |
`transformationContext` | WrapFieldsTransformationContext |

**Returns:** *[Request](../interfaces/_utils_src_index_.request)*

___

###  transformResult

▸ **transformResult**(`originalResult`: [ExecutionResult](../interfaces/_utils_src_index_.executionresult), `delegationContext`: Record‹string, any›, `transformationContext`: WrapFieldsTransformationContext): *[ExecutionResult](../interfaces/_utils_src_index_.executionresult)*

*Defined in [packages/wrap/src/transforms/WrapFields.ts:149](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/WrapFields.ts#L149)*

**Parameters:**

Name | Type |
------ | ------ |
`originalResult` | [ExecutionResult](../interfaces/_utils_src_index_.executionresult) |
`delegationContext` | Record‹string, any› |
`transformationContext` | WrapFieldsTransformationContext |

**Returns:** *[ExecutionResult](../interfaces/_utils_src_index_.executionresult)*

___

###  transformSchema

▸ **transformSchema**(`schema`: GraphQLSchema): *GraphQLSchema*

*Defined in [packages/wrap/src/transforms/WrapFields.ts:96](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/WrapFields.ts#L96)*

**Parameters:**

Name | Type |
------ | ------ |
`schema` | GraphQLSchema |

**Returns:** *GraphQLSchema*
