---
id: "_wrap_src_index_.wraptype"
title: "WrapType"
sidebar_label: "WrapType"
---

## Hierarchy

* **WrapType**

## Implements

* [Transform](/docs/api/interfaces/_utils_src_index_.transform)

## Index

### Constructors

* [constructor](_wrap_src_index_.wraptype.md#constructor)

### Methods

* [transformRequest](_wrap_src_index_.wraptype.md#transformrequest)
* [transformResult](_wrap_src_index_.wraptype.md#transformresult)
* [transformSchema](_wrap_src_index_.wraptype.md#transformschema)

## Constructors

###  constructor

\+ **new WrapType**(`outerTypeName`: string, `innerTypeName`: string, `fieldName`: string): *[WrapType](_wrap_src_index_.wraptype)*

*Defined in [packages/wrap/src/transforms/WrapType.ts:8](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/WrapType.ts#L8)*

**Parameters:**

Name | Type |
------ | ------ |
`outerTypeName` | string |
`innerTypeName` | string |
`fieldName` | string |

**Returns:** *[WrapType](_wrap_src_index_.wraptype)*

## Methods

###  transformRequest

▸ **transformRequest**(`originalRequest`: [Request](/docs/api/interfaces/_utils_src_index_.request), `delegationContext?`: Record‹string, any›, `transformationContext?`: Record‹string, any›): *[Request](/docs/api/interfaces/_utils_src_index_.request)*

*Defined in [packages/wrap/src/transforms/WrapType.ts:18](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/WrapType.ts#L18)*

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

*Defined in [packages/wrap/src/transforms/WrapType.ts:26](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/WrapType.ts#L26)*

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

*Defined in [packages/wrap/src/transforms/WrapType.ts:14](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/WrapType.ts#L14)*

**Parameters:**

Name | Type |
------ | ------ |
`schema` | GraphQLSchema |

**Returns:** *GraphQLSchema*
