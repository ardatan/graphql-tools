# @graphql-tools/links

### Classes

- [AwaitVariablesLink](/docs/api/classes/links_src.AwaitVariablesLink)

### Variables

- [GraphQLUpload](links_src#graphqlupload)

### Functions

- [createServerHttpLink](links_src#createserverhttplink)
- [linkToExecutor](links_src#linktoexecutor)

## Variables

### GraphQLUpload

• `Const` **GraphQLUpload**: `GraphQLScalarType`\<`any`, `unknown`>

#### Defined in

[packages/links/src/GraphQLUpload.ts:4](https://github.com/ardatan/graphql-tools/blob/master/packages/links/src/GraphQLUpload.ts#L4)

## Functions

### createServerHttpLink

▸ **createServerHttpLink**(`options`): `ApolloLink`

#### Parameters

| Name      | Type  |
| :-------- | :---- |
| `options` | `any` |

#### Returns

`ApolloLink`

#### Defined in

[packages/links/src/createServerHttpLink.ts:9](https://github.com/ardatan/graphql-tools/blob/master/packages/links/src/createServerHttpLink.ts#L9)

---

### linkToExecutor

▸ **linkToExecutor**(`link`): [`Executor`](utils_src#executor)

#### Parameters

| Name   | Type         |
| :----- | :----------- |
| `link` | `ApolloLink` |

#### Returns

[`Executor`](utils_src#executor)

#### Defined in

[packages/links/src/linkToExecutor.ts:12](https://github.com/ardatan/graphql-tools/blob/master/packages/links/src/linkToExecutor.ts#L12)
