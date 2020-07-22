---
id: "_wrap_src_index_.extractfield"
title: "ExtractField"
sidebar_label: "ExtractField"
---

## Hierarchy

* **ExtractField**

## Implements

* [Transform](/docs/api/interfaces/_utils_src_index_.transform)

## Index

### Constructors

* [constructor](_wrap_src_index_.extractfield.md#constructor)

### Methods

* [transformRequest](_wrap_src_index_.extractfield.md#transformrequest)

## Constructors

###  constructor

\+ **new ExtractField**(`__namedParameters`: object): *[ExtractField](_wrap_src_index_.extractfield)*

*Defined in [packages/wrap/src/transforms/ExtractField.ts:7](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/ExtractField.ts#L7)*

**Parameters:**

▪ **__namedParameters**: *object*

Name | Type |
------ | ------ |
`from` | string[] |
`to` | string[] |

**Returns:** *[ExtractField](_wrap_src_index_.extractfield)*

## Methods

###  transformRequest

▸ **transformRequest**(`originalRequest`: [Request](/docs/api/interfaces/_utils_src_index_.request)): *[Request](/docs/api/interfaces/_utils_src_index_.request)*

*Defined in [packages/wrap/src/transforms/ExtractField.ts:14](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/ExtractField.ts#L14)*

**Parameters:**

Name | Type |
------ | ------ |
`originalRequest` | [Request](/docs/api/interfaces/_utils_src_index_.request) |

**Returns:** *[Request](/docs/api/interfaces/_utils_src_index_.request)*
