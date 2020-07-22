---
id: "_wrap_src_index_.hoistfield"
title: "HoistField"
sidebar_label: "HoistField"
---

## Hierarchy

* **HoistField**

## Implements

* [Transform](/docs/api/interfaces/_utils_src_index_.transform)

## Index

### Constructors

* [constructor](_wrap_src_index_.hoistfield.md#constructor)

### Methods

* [transformRequest](_wrap_src_index_.hoistfield.md#transformrequest)
* [transformResult](_wrap_src_index_.hoistfield.md#transformresult)
* [transformSchema](_wrap_src_index_.hoistfield.md#transformschema)

## Constructors

###  constructor

\+ **new HoistField**(`typeName`: string, `path`: Array‹string›, `newFieldName`: string, `alias`: string): *[HoistField](_wrap_src_index_.hoistfield)*

*Defined in [packages/wrap/src/transforms/HoistField.ts:22](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/HoistField.ts#L22)*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`typeName` | string | - |
`path` | Array‹string› | - |
`newFieldName` | string | - |
`alias` | string | "__gqtlw__" |

**Returns:** *[HoistField](_wrap_src_index_.hoistfield)*

## Methods

###  transformRequest

▸ **transformRequest**(`originalRequest`: [Request](/docs/api/interfaces/_utils_src_index_.request), `delegationContext?`: Record‹string, any›, `transformationContext?`: Record‹string, any›): *[Request](/docs/api/interfaces/_utils_src_index_.request)*

*Defined in [packages/wrap/src/transforms/HoistField.ts:72](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/HoistField.ts#L72)*

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

*Defined in [packages/wrap/src/transforms/HoistField.ts:80](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/HoistField.ts#L80)*

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

*Defined in [packages/wrap/src/transforms/HoistField.ts:46](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/HoistField.ts#L46)*

**Parameters:**

Name | Type |
------ | ------ |
`schema` | GraphQLSchema |

**Returns:** *GraphQLSchema*
