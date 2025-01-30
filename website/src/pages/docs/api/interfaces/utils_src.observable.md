[graphql-tools-monorepo](../README) / [utils/src](../modules/utils_src) / Observable

# Interface: Observable<T\>

[utils/src](../modules/utils_src).Observable

## Type parameters

| Name |
| :--- |
| `T`  |

## Table of contents

### Methods

- [subscribe](utils_src.Observable#subscribe)

## Methods

### subscribe

▸ **subscribe**(`observer`): `Object`

#### Parameters

| Name       | Type                                   |
| :--------- | :------------------------------------- |
| `observer` | [`Observer`](utils_src.Observer)\<`T`> |

#### Returns

`Object`

| Name          | Type         |
| :------------ | :----------- |
| `unsubscribe` | () => `void` |

#### Defined in

[packages/utils/src/observableToAsyncIterable.ts:8](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/observableToAsyncIterable.ts#L8)
