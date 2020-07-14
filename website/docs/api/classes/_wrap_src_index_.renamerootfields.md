---
id: "_wrap_src_index_.renamerootfields"
title: "RenameRootFields"
sidebar_label: "RenameRootFields"
---

## Hierarchy

* **RenameRootFields**

## Implements

* [Transform](../interfaces/_utils_src_index_.transform)

## Index

### Constructors

* [constructor](_wrap_src_index_.renamerootfields.md#constructor)

### Methods

* [transformRequest](_wrap_src_index_.renamerootfields.md#transformrequest)
* [transformSchema](_wrap_src_index_.renamerootfields.md#transformschema)

## Constructors

###  constructor

\+ **new RenameRootFields**(`renamer`: function): *[RenameRootFields](_wrap_src_index_.renamerootfields)*

*Defined in [packages/wrap/src/transforms/RenameRootFields.ts:8](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameRootFields.ts#L8)*

**Parameters:**

▪ **renamer**: *function*

▸ (`operation`: "Query" | "Mutation" | "Subscription", `name`: string, `fieldConfig`: GraphQLFieldConfig‹any, any›): *string*

**Parameters:**

Name | Type |
------ | ------ |
`operation` | "Query" &#124; "Mutation" &#124; "Subscription" |
`name` | string |
`fieldConfig` | GraphQLFieldConfig‹any, any› |

**Returns:** *[RenameRootFields](_wrap_src_index_.renamerootfields)*

## Methods

###  transformRequest

▸ **transformRequest**(`originalRequest`: [Request](../interfaces/_utils_src_index_.request)): *[Request](../interfaces/_utils_src_index_.request)*

*Defined in [packages/wrap/src/transforms/RenameRootFields.ts:30](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameRootFields.ts#L30)*

**Parameters:**

Name | Type |
------ | ------ |
`originalRequest` | [Request](../interfaces/_utils_src_index_.request) |

**Returns:** *[Request](../interfaces/_utils_src_index_.request)*

___

###  transformSchema

▸ **transformSchema**(`originalSchema`: GraphQLSchema): *GraphQLSchema*

*Defined in [packages/wrap/src/transforms/RenameRootFields.ts:26](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameRootFields.ts#L26)*

**Parameters:**

Name | Type |
------ | ------ |
`originalSchema` | GraphQLSchema |

**Returns:** *GraphQLSchema*
