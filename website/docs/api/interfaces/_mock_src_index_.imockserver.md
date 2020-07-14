---
id: "_mock_src_index_.imockserver"
title: "IMockServer"
sidebar_label: "IMockServer"
---

## Hierarchy

* **IMockServer**

## Index

### Properties

* [query](_mock_src_index_.imockserver.md#query)

## Properties

###  query

• **query**: *function*

*Defined in [packages/mock/src/types.ts:39](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L39)*

Executes the provided query against the mocked schema.

**`param`** Variables

#### Type declaration:

▸ (`query`: string, `vars?`: Record‹string, any›): *Promise‹[ExecutionResult](_utils_src_index_.executionresult)›*

GraphQL query to execute

**Parameters:**

Name | Type |
------ | ------ |
`query` | string |
`vars?` | Record‹string, any› |
