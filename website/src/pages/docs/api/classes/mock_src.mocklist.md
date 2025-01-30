[graphql-tools-monorepo](../README) / [mock/src](../modules/mock_src) / MockList

# Class: MockList

[mock/src](../modules/mock_src).MockList

This is an object you can return from your mock resolvers which calls the provided `mockFunction`
once for each list item.

## Table of contents

### Constructors

- [constructor](mock_src.MockList#constructor)

### Methods

- [mock](mock_src.MockList#mock)

## Constructors

### constructor

• **new MockList**(`length`, `mockFunction?`)

#### Parameters

| Name            | Type                   | Description                                                                                              |
| :-------------- | :--------------------- | :------------------------------------------------------------------------------------------------------- |
| `length`        | `number` \| `number`[] | Either the exact length of items to return or an inclusive range of possible lengths.                    |
| `mockFunction?` | () => `unknown`        | The function to call for each item in the list to resolve it. It can return another MockList or a value. |

#### Defined in

[packages/mock/src/MockList.ts:31](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/MockList.ts#L31)

## Methods

### mock

▸ **mock**(): `unknown`[]

#### Returns

`unknown`[]

#### Defined in

[packages/mock/src/MockList.ts:44](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/MockList.ts#L44)
