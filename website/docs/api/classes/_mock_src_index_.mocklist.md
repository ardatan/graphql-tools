---
id: "_mock_src_index_.mocklist"
title: "MockList"
sidebar_label: "MockList"
---

This is an object you can return from your mock resolvers which calls the
provided `mockFunction` once for each list item.

## Hierarchy

* **MockList**

## Index

### Constructors

* [constructor](_mock_src_index_.mocklist.md#constructor)

## Constructors

###  constructor

\+ **new MockList**(`length`: number | Array‹number›, `mockFunction?`: GraphQLFieldResolver‹any, any›): *[MockList](_mock_src_index_.mocklist)*

*Defined in [packages/mock/src/mocking.ts:367](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/mocking.ts#L367)*

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`length` | number &#124; Array‹number› | Either the exact length of items to return or an inclusive range of possible lengths. |
`mockFunction?` | GraphQLFieldResolver‹any, any› | The function to call for each item in the list to resolve it. It can return another MockList or a value.  |

**Returns:** *[MockList](_mock_src_index_.mocklist)*
