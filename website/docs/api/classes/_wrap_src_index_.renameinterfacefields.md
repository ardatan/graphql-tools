---
id: "_wrap_src_index_.renameinterfacefields"
title: "RenameInterfaceFields"
sidebar_label: "RenameInterfaceFields"
---

## Hierarchy

* **RenameInterfaceFields**

## Implements

* [Transform](../interfaces/_utils_src_index_.transform)

## Index

### Constructors

* [constructor](_wrap_src_index_.renameinterfacefields.md#constructor)

### Methods

* [transformRequest](_wrap_src_index_.renameinterfacefields.md#transformrequest)
* [transformSchema](_wrap_src_index_.renameinterfacefields.md#transformschema)

## Constructors

###  constructor

\+ **new RenameInterfaceFields**(`renamer`: function): *[RenameInterfaceFields](_wrap_src_index_.renameinterfacefields)*

*Defined in [packages/wrap/src/transforms/RenameInterfaceFields.ts:8](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameInterfaceFields.ts#L8)*

**Parameters:**

▪ **renamer**: *function*

▸ (`typeName`: string, `fieldName`: string, `fieldConfig`: GraphQLFieldConfig‹any, any›): *string*

**Parameters:**

Name | Type |
------ | ------ |
`typeName` | string |
`fieldName` | string |
`fieldConfig` | GraphQLFieldConfig‹any, any› |

**Returns:** *[RenameInterfaceFields](_wrap_src_index_.renameinterfacefields)*

## Methods

###  transformRequest

▸ **transformRequest**(`originalRequest`: [Request](../interfaces/_utils_src_index_.request)): *[Request](../interfaces/_utils_src_index_.request)*

*Defined in [packages/wrap/src/transforms/RenameInterfaceFields.ts:23](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameInterfaceFields.ts#L23)*

**Parameters:**

Name | Type |
------ | ------ |
`originalRequest` | [Request](../interfaces/_utils_src_index_.request) |

**Returns:** *[Request](../interfaces/_utils_src_index_.request)*

___

###  transformSchema

▸ **transformSchema**(`originalSchema`: GraphQLSchema): *GraphQLSchema*

*Defined in [packages/wrap/src/transforms/RenameInterfaceFields.ts:19](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameInterfaceFields.ts#L19)*

**Parameters:**

Name | Type |
------ | ------ |
`originalSchema` | GraphQLSchema |

**Returns:** *GraphQLSchema*
