---
id: "mock"
title: "@graphql-tools/mock"
sidebar_label: "mock"
---

### Classes

* [MockList](../classes/_mock_src_index_.mocklist)

### Interfaces

* [IMockOptions](../interfaces/_mock_src_index_.imockoptions)
* [IMockServer](../interfaces/_mock_src_index_.imockserver)
* [IMocks](../interfaces/_mock_src_index_.imocks)

### Type aliases

* [IMockFn](_mock_src_index_.md#imockfn)

### Functions

* [addMocksToSchema](_mock_src_index_.md#addmockstoschema)
* [mockServer](_mock_src_index_.md#mockserver)

## Type aliases

###  IMockFn

Ƭ **IMockFn**: *GraphQLFieldResolver‹any, any›*

*Defined in [packages/mock/src/types.ts:6](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L6)*

## Functions

###  addMocksToSchema

▸ **addMocksToSchema**(`__namedParameters`: object): *GraphQLSchema*

*Defined in [packages/mock/src/mocking.ts:82](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/mocking.ts#L82)*

Given an instance of GraphQLSchema and a mock object, returns a new schema
that can return mock data for any valid query that is sent to the server.

**Parameters:**

▪ **__namedParameters**: *object*

Name | Type | Default |
------ | ------ | ------ |
`mocks` | [IMocks](../interfaces/_mock_src_index_.imocks) | - |
`preserveResolvers` | boolean | false |
`schema` | GraphQLSchema‹› | - |

**Returns:** *GraphQLSchema*

___

###  mockServer

▸ **mockServer**(`schema`: GraphQLSchema | [ITypeDefinitions](_utils_src_index_.md#itypedefinitions), `mocks`: [IMocks](../interfaces/_mock_src_index_.imocks), `preserveResolvers`: boolean): *[IMockServer](../interfaces/_mock_src_index_.imockserver)*

*Defined in [packages/mock/src/mocking.ts:39](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/mocking.ts#L39)*

A convenience wrapper on top of addMocksToSchema. It adds your mock resolvers
to your schema and returns a client that will correctly execute your query with
variables. Note: when executing queries from the returned server, context and
root will both equal `{}`.

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`schema` | GraphQLSchema &#124; [ITypeDefinitions](_utils_src_index_.md#itypedefinitions) | - | The schema to which to add mocks. This can also be a set of type definitions instead. |
`mocks` | [IMocks](../interfaces/_mock_src_index_.imocks) | - | The mocks to add to the schema. |
`preserveResolvers` | boolean | false | Set to `true` to prevent existing resolvers from being overwritten to provide mock data. This can be used to mock some parts of the server and not others.  |

**Returns:** *[IMockServer](../interfaces/_mock_src_index_.imockserver)*
