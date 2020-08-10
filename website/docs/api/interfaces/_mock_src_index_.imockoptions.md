---
id: "_mock_src_index_.imockoptions"
title: "IMockOptions"
sidebar_label: "IMockOptions"
---

## Hierarchy

* **IMockOptions**

## Index

### Properties

* [mocks](_mock_src_index_.imockoptions.md#optional-mocks)
* [preserveResolvers](_mock_src_index_.imockoptions.md#optional-preserveresolvers)
* [schema](_mock_src_index_.imockoptions.md#optional-schema)

## Properties

### `Optional` mocks

• **mocks**? : *[IMocks](_mock_src_index_.imocks.md)*

*Defined in [packages/mock/src/types.ts:25](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L25)*

The mocks to add to the schema.

___

### `Optional` preserveResolvers

• **preserveResolvers**? : *boolean*

*Defined in [packages/mock/src/types.ts:30](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L30)*

Set to `true` to prevent existing resolvers from being overwritten to provide
mock data. This can be used to mock some parts of the server and not others.

___

### `Optional` schema

• **schema**? : *GraphQLSchema*

*Defined in [packages/mock/src/types.ts:21](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L21)*

The schema to which to add mocks. This can also be a set of type definitions instead.
