---
id: "_wrap_src_index_.renameinputobjectfields"
title: "RenameInputObjectFields"
sidebar_label: "RenameInputObjectFields"
---

## Hierarchy

* **RenameInputObjectFields**

## Implements

* [Transform](../interfaces/_utils_src_index_.transform)

## Index

### Constructors

* [constructor](_wrap_src_index_.renameinputobjectfields.md#constructor)

### Methods

* [transformRequest](_wrap_src_index_.renameinputobjectfields.md#transformrequest)
* [transformSchema](_wrap_src_index_.renameinputobjectfields.md#transformschema)

## Constructors

###  constructor

\+ **new RenameInputObjectFields**(`renamer`: function): *[RenameInputObjectFields](_wrap_src_index_.renameinputobjectfields)*

*Defined in [packages/wrap/src/transforms/RenameInputObjectFields.ts:10](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameInputObjectFields.ts#L10)*

**Parameters:**

▪ **renamer**: *function*

▸ (`typeName`: string, `fieldName`: string, `inputFieldConfig`: GraphQLInputFieldConfig): *string*

**Parameters:**

Name | Type |
------ | ------ |
`typeName` | string |
`fieldName` | string |
`inputFieldConfig` | GraphQLInputFieldConfig |

**Returns:** *[RenameInputObjectFields](_wrap_src_index_.renameinputobjectfields)*

## Methods

###  transformRequest

▸ **transformRequest**(`originalRequest`: [Request](../interfaces/_utils_src_index_.request), `delegationContext?`: Record‹string, any›): *[Request](../interfaces/_utils_src_index_.request)*

*Defined in [packages/wrap/src/transforms/RenameInputObjectFields.ts:68](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameInputObjectFields.ts#L68)*

**Parameters:**

Name | Type |
------ | ------ |
`originalRequest` | [Request](../interfaces/_utils_src_index_.request) |
`delegationContext?` | Record‹string, any› |

**Returns:** *[Request](../interfaces/_utils_src_index_.request)*

___

###  transformSchema

▸ **transformSchema**(`originalSchema`: GraphQLSchema): *GraphQLSchema*

*Defined in [packages/wrap/src/transforms/RenameInputObjectFields.ts:43](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameInputObjectFields.ts#L43)*

**Parameters:**

Name | Type |
------ | ------ |
`originalSchema` | GraphQLSchema |

**Returns:** *GraphQLSchema*
