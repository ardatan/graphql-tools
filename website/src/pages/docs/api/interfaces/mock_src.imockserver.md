[graphql-tools-monorepo](../README) / [mock/src](../modules/mock_src) / IMockServer

# Interface: IMockServer

[mock/src](../modules/mock_src).IMockServer

## Table of contents

### Properties

- [query](mock_src.IMockServer#query)

## Properties

### query

• **query**: (`query`: `string`, `vars?`: `Record`\<`string`, `any`>) =>
`Promise`\<[`ExecutionResult`](utils_src.ExecutionResult)\<`any`, `any`>>

#### Type declaration

▸ (`query`, `vars?`): `Promise`\<[`ExecutionResult`](utils_src.ExecutionResult)\<`any`, `any`>>

Executes the provided query against the mocked schema.

##### Parameters

| Name    | Type                       | Description              |
| :------ | :------------------------- | :----------------------- |
| `query` | `string`                   | GraphQL query to execute |
| `vars?` | `Record`\<`string`, `any`> | Variables                |

##### Returns

`Promise`\<[`ExecutionResult`](utils_src.ExecutionResult)\<`any`, `any`>>

#### Defined in

[packages/mock/src/types.ts:248](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L248)
