---
id: "_wrap_src_index_.filtertypes"
title: "FilterTypes"
sidebar_label: "FilterTypes"
---

## Hierarchy

* **FilterTypes**

## Implements

* [Transform](/docs/api/interfaces/_utils_src_index_.transform)

## Index

### Constructors

* [constructor](_wrap_src_index_.filtertypes.md#constructor)

### Methods

* [transformSchema](_wrap_src_index_.filtertypes.md#transformschema)

## Constructors

###  constructor

\+ **new FilterTypes**(`filter`: function): *[FilterTypes](_wrap_src_index_.filtertypes)*

*Defined in [packages/wrap/src/transforms/FilterTypes.ts:6](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/FilterTypes.ts#L6)*

**Parameters:**

▪ **filter**: *function*

▸ (`type`: GraphQLNamedType): *boolean*

**Parameters:**

Name | Type |
------ | ------ |
`type` | GraphQLNamedType |

**Returns:** *[FilterTypes](_wrap_src_index_.filtertypes)*

## Methods

###  transformSchema

▸ **transformSchema**(`schema`: GraphQLSchema): *GraphQLSchema*

*Defined in [packages/wrap/src/transforms/FilterTypes.ts:12](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/FilterTypes.ts#L12)*

**Parameters:**

Name | Type |
------ | ------ |
`schema` | GraphQLSchema |

**Returns:** *GraphQLSchema*
