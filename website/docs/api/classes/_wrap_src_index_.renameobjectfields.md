---
id: "_wrap_src_index_.renameobjectfields"
title: "RenameObjectFields"
sidebar_label: "RenameObjectFields"
---

## Hierarchy

* **RenameObjectFields**

## Implements

* [Transform](../interfaces/_utils_src_index_.transform)

## Index

### Constructors

* [constructor](_wrap_src_index_.renameobjectfields.md#constructor)

### Methods

* [transformRequest](_wrap_src_index_.renameobjectfields.md#transformrequest)
* [transformSchema](_wrap_src_index_.renameobjectfields.md#transformschema)

## Constructors

###  constructor

\+ **new RenameObjectFields**(`renamer`: function): *[RenameObjectFields](_wrap_src_index_.renameobjectfields)*

*Defined in [packages/wrap/src/transforms/RenameObjectFields.ts:8](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameObjectFields.ts#L8)*

**Parameters:**

▪ **renamer**: *function*

▸ (`typeName`: string, `fieldName`: string, `fieldConfig`: GraphQLFieldConfig‹any, any›): *string*

**Parameters:**

Name | Type |
------ | ------ |
`typeName` | string |
`fieldName` | string |
`fieldConfig` | GraphQLFieldConfig‹any, any› |

**Returns:** *[RenameObjectFields](_wrap_src_index_.renameobjectfields)*

## Methods

###  transformRequest

▸ **transformRequest**(`originalRequest`: [Request](../interfaces/_utils_src_index_.request)): *[Request](../interfaces/_utils_src_index_.request)*

*Defined in [packages/wrap/src/transforms/RenameObjectFields.ts:23](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameObjectFields.ts#L23)*

**Parameters:**

Name | Type |
------ | ------ |
`originalRequest` | [Request](../interfaces/_utils_src_index_.request) |

**Returns:** *[Request](../interfaces/_utils_src_index_.request)*

___

###  transformSchema

▸ **transformSchema**(`originalSchema`: GraphQLSchema): *GraphQLSchema*

*Defined in [packages/wrap/src/transforms/RenameObjectFields.ts:19](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameObjectFields.ts#L19)*

**Parameters:**

Name | Type |
------ | ------ |
`originalSchema` | GraphQLSchema |

**Returns:** *GraphQLSchema*
