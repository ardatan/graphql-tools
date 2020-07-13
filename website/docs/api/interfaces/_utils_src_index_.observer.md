---
id: "_utils_src_index_.observer"
title: "Observer"
sidebar_label: "Observer"
---

## Type parameters

▪ **T**

## Hierarchy

* **Observer**

## Index

### Properties

* [complete](_utils_src_index_.observer.md#optional-complete)
* [error](_utils_src_index_.observer.md#optional-error)
* [next](_utils_src_index_.observer.md#optional-next)

## Properties

### `Optional` complete

• **complete**? : *function*

*Defined in [packages/utils/src/observableToAsyncIterable.ts:4](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/observableToAsyncIterable.ts#L4)*

#### Type declaration:

▸ (): *void*

___

### `Optional` error

• **error**? : *function*

*Defined in [packages/utils/src/observableToAsyncIterable.ts:3](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/observableToAsyncIterable.ts#L3)*

#### Type declaration:

▸ (`error`: Error): *void*

**Parameters:**

Name | Type |
------ | ------ |
`error` | Error |

___

### `Optional` next

• **next**? : *function*

*Defined in [packages/utils/src/observableToAsyncIterable.ts:2](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/observableToAsyncIterable.ts#L2)*

#### Type declaration:

▸ (`value`: T): *void*

**Parameters:**

Name | Type |
------ | ------ |
`value` | T |
