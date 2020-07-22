---
id: "_wrap_src_index_.renameroottypes"
title: "RenameRootTypes"
sidebar_label: "RenameRootTypes"
---

## Hierarchy

* **RenameRootTypes**

## Implements

* [Transform](/docs/api/interfaces/_utils_src_index_.transform)

## Index

### Constructors

* [constructor](_wrap_src_index_.renameroottypes.md#constructor)

### Methods

* [transformRequest](_wrap_src_index_.renameroottypes.md#transformrequest)
* [transformResult](_wrap_src_index_.renameroottypes.md#transformresult)
* [transformSchema](_wrap_src_index_.renameroottypes.md#transformschema)

## Constructors

###  constructor

\+ **new RenameRootTypes**(`renamer`: function): *[RenameRootTypes](_wrap_src_index_.renameroottypes)*

*Defined in [packages/wrap/src/transforms/RenameRootTypes.ts:16](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameRootTypes.ts#L16)*

**Parameters:**

▪ **renamer**: *function*

▸ (`name`: string): *string | undefined*

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |

**Returns:** *[RenameRootTypes](_wrap_src_index_.renameroottypes)*

## Methods

###  transformRequest

▸ **transformRequest**(`originalRequest`: [Request](/docs/api/interfaces/_utils_src_index_.request)): *[Request](/docs/api/interfaces/_utils_src_index_.request)*

*Defined in [packages/wrap/src/transforms/RenameRootTypes.ts:39](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameRootTypes.ts#L39)*

**Parameters:**

Name | Type |
------ | ------ |
`originalRequest` | [Request](/docs/api/interfaces/_utils_src_index_.request) |

**Returns:** *[Request](/docs/api/interfaces/_utils_src_index_.request)*

___

###  transformResult

▸ **transformResult**(`result`: [ExecutionResult](/docs/api/interfaces/_utils_src_index_.executionresult)): *[ExecutionResult](/docs/api/interfaces/_utils_src_index_.executionresult)*

*Defined in [packages/wrap/src/transforms/RenameRootTypes.ts:60](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameRootTypes.ts#L60)*

**Parameters:**

Name | Type |
------ | ------ |
`result` | [ExecutionResult](/docs/api/interfaces/_utils_src_index_.executionresult) |

**Returns:** *[ExecutionResult](/docs/api/interfaces/_utils_src_index_.executionresult)*

___

###  transformSchema

▸ **transformSchema**(`originalSchema`: GraphQLSchema): *GraphQLSchema*

*Defined in [packages/wrap/src/transforms/RenameRootTypes.ts:24](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameRootTypes.ts#L24)*

**Parameters:**

Name | Type |
------ | ------ |
`originalSchema` | GraphQLSchema |

**Returns:** *GraphQLSchema*
