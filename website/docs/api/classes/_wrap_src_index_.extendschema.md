---
id: "_wrap_src_index_.extendschema"
title: "ExtendSchema"
sidebar_label: "ExtendSchema"
---

## Hierarchy

* **ExtendSchema**

## Implements

* [Transform](/docs/api/interfaces/_utils_src_index_.transform)

## Index

### Constructors

* [constructor](_wrap_src_index_.extendschema.md#constructor)

### Methods

* [transformRequest](_wrap_src_index_.extendschema.md#transformrequest)
* [transformResult](_wrap_src_index_.extendschema.md#transformresult)
* [transformSchema](_wrap_src_index_.extendschema.md#transformschema)

## Constructors

###  constructor

\+ **new ExtendSchema**(`__namedParameters`: object): *[ExtendSchema](_wrap_src_index_.extendschema)*

*Defined in [packages/wrap/src/transforms/ExtendSchema.ts:22](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/ExtendSchema.ts#L22)*

**Parameters:**

▪ **__namedParameters**: *object*

Name | Type |
------ | ------ |
`defaultFieldResolver` | function |
`errorsTransformer` | function |
`fieldNodeTransformerMap` | object |
`objectValueTransformerMap` | object |
`resolvers` | object |
`typeDefs` | string |

**Returns:** *[ExtendSchema](_wrap_src_index_.extendschema)*

## Methods

###  transformRequest

▸ **transformRequest**(`originalRequest`: [Request](/docs/api/interfaces/_utils_src_index_.request), `delegationContext?`: Record‹string, any›, `transformationContext?`: Record‹string, any›): *[Request](/docs/api/interfaces/_utils_src_index_.request)*

*Defined in [packages/wrap/src/transforms/ExtendSchema.ts:61](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/ExtendSchema.ts#L61)*

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

*Defined in [packages/wrap/src/transforms/ExtendSchema.ts:69](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/ExtendSchema.ts#L69)*

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

*Defined in [packages/wrap/src/transforms/ExtendSchema.ts:49](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/ExtendSchema.ts#L49)*

**Parameters:**

Name | Type |
------ | ------ |
`schema` | GraphQLSchema |

**Returns:** *GraphQLSchema*
