[graphql-tools-monorepo](../README) / [utils/src](../modules/utils_src) / Observer

# Interface: Observer<T\>

[utils/src](../modules/utils_src).Observer

## Type parameters

| Name |
| :--- |
| `T`  |

## Table of contents

### Properties

- [complete](utils_src.Observer#complete)
- [error](utils_src.Observer#error)
- [next](utils_src.Observer#next)

## Properties

### complete

• **complete**: () => `void`

#### Type declaration

▸ (): `void`

##### Returns

`void`

#### Defined in

[packages/utils/src/observableToAsyncIterable.ts:4](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/observableToAsyncIterable.ts#L4)

---

### error

• **error**: (`error`: `Error`) => `void`

#### Type declaration

▸ (`error`): `void`

##### Parameters

| Name    | Type    |
| :------ | :------ |
| `error` | `Error` |

##### Returns

`void`

#### Defined in

[packages/utils/src/observableToAsyncIterable.ts:3](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/observableToAsyncIterable.ts#L3)

---

### next

• **next**: (`value`: `T`) => `void`

#### Type declaration

▸ (`value`): `void`

##### Parameters

| Name    | Type |
| :------ | :--- |
| `value` | `T`  |

##### Returns

`void`

#### Defined in

[packages/utils/src/observableToAsyncIterable.ts:2](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/observableToAsyncIterable.ts#L2)
