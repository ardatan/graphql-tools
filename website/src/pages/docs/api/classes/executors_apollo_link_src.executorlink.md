[graphql-tools-monorepo](../README) /
[executors/apollo-link/src](../modules/executors_apollo_link_src) / ExecutorLink

# Class: ExecutorLink

[executors/apollo-link/src](../modules/executors_apollo_link_src).ExecutorLink

## Hierarchy

- `ApolloLink`

  ↳ **`ExecutorLink`**

## Table of contents

### Constructors

- [constructor](executors_apollo_link_src.ExecutorLink#constructor)

### Methods

- [concat](executors_apollo_link_src.ExecutorLink#concat)
- [request](executors_apollo_link_src.ExecutorLink#request)
- [setOnError](executors_apollo_link_src.ExecutorLink#setonerror)
- [split](executors_apollo_link_src.ExecutorLink#split)
- [concat](executors_apollo_link_src.ExecutorLink#concat-1)
- [empty](executors_apollo_link_src.ExecutorLink#empty)
- [execute](executors_apollo_link_src.ExecutorLink#execute)
- [from](executors_apollo_link_src.ExecutorLink#from)
- [split](executors_apollo_link_src.ExecutorLink#split-1)

## Constructors

### constructor

• **new ExecutorLink**(`executor`)

#### Parameters

| Name       | Type                                        |
| :--------- | :------------------------------------------ |
| `executor` | [`Executor`](../modules/utils_src#executor) |

#### Overrides

apollo.ApolloLink.constructor

#### Defined in

[packages/executors/apollo-link/src/index.ts:44](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/apollo-link/src/index.ts#L44)

## Methods

### concat

▸ **concat**(`next`): `ApolloLink`

#### Parameters

| Name   | Type                             |
| :----- | :------------------------------- |
| `next` | `RequestHandler` \| `ApolloLink` |

#### Returns

`ApolloLink`

#### Inherited from

apollo.ApolloLink.concat

#### Defined in

node_modules/@apollo/client/link/core/ApolloLink.d.ts:12

---

### request

▸ **request**(`operation`, `forward?`): `null` \| `Observable`\<`FetchResult`>

#### Parameters

| Name        | Type        |
| :---------- | :---------- |
| `operation` | `Operation` |
| `forward?`  | `NextLink`  |

#### Returns

`null` \| `Observable`\<`FetchResult`>

#### Inherited from

apollo.ApolloLink.request

#### Defined in

node_modules/@apollo/client/link/core/ApolloLink.d.ts:13

---

### setOnError

▸ **setOnError**(`fn`): [`ExecutorLink`](executors_apollo_link_src.ExecutorLink)

#### Parameters

| Name | Type                                                                           |
| :--- | :----------------------------------------------------------------------------- |
| `fn` | (`error`: `any`, `observer?`: `Observer`\<`FetchResult`>) => `false` \| `void` |

#### Returns

[`ExecutorLink`](executors_apollo_link_src.ExecutorLink)

#### Inherited from

apollo.ApolloLink.setOnError

#### Defined in

node_modules/@apollo/client/link/core/ApolloLink.d.ts:15

---

### split

▸ **split**(`test`, `left`, `right?`): `ApolloLink`

#### Parameters

| Name     | Type                             |
| :------- | :------------------------------- |
| `test`   | (`op`: `Operation`) => `boolean` |
| `left`   | `RequestHandler` \| `ApolloLink` |
| `right?` | `RequestHandler` \| `ApolloLink` |

#### Returns

`ApolloLink`

#### Inherited from

apollo.ApolloLink.split

#### Defined in

node_modules/@apollo/client/link/core/ApolloLink.d.ts:11

---

### concat

▸ `Static` **concat**(`first`, `second`): `ApolloLink`

#### Parameters

| Name     | Type                             |
| :------- | :------------------------------- |
| `first`  | `RequestHandler` \| `ApolloLink` |
| `second` | `RequestHandler` \| `ApolloLink` |

#### Returns

`ApolloLink`

#### Inherited from

apollo.ApolloLink.concat

#### Defined in

node_modules/@apollo/client/link/core/ApolloLink.d.ts:9

---

### empty

▸ `Static` **empty**(): `ApolloLink`

#### Returns

`ApolloLink`

#### Inherited from

apollo.ApolloLink.empty

#### Defined in

node_modules/@apollo/client/link/core/ApolloLink.d.ts:5

---

### execute

▸ `Static` **execute**(`link`, `operation`): `Observable`\<`FetchResult`>

#### Parameters

| Name        | Type                                          |
| :---------- | :-------------------------------------------- |
| `link`      | `ApolloLink`                                  |
| `operation` | `GraphQLRequest`\<`Record`\<`string`, `any`>> |

#### Returns

`Observable`\<`FetchResult`>

#### Inherited from

apollo.ApolloLink.execute

#### Defined in

node_modules/@apollo/client/link/core/ApolloLink.d.ts:8

---

### from

▸ `Static` **from**(`links`): `ApolloLink`

#### Parameters

| Name    | Type                                 |
| :------ | :----------------------------------- |
| `links` | (`RequestHandler` \| `ApolloLink`)[] |

#### Returns

`ApolloLink`

#### Inherited from

apollo.ApolloLink.from

#### Defined in

node_modules/@apollo/client/link/core/ApolloLink.d.ts:6

---

### split

▸ `Static` **split**(`test`, `left`, `right?`): `ApolloLink`

#### Parameters

| Name     | Type                             |
| :------- | :------------------------------- |
| `test`   | (`op`: `Operation`) => `boolean` |
| `left`   | `RequestHandler` \| `ApolloLink` |
| `right?` | `RequestHandler` \| `ApolloLink` |

#### Returns

`ApolloLink`

#### Inherited from

apollo.ApolloLink.split

#### Defined in

node_modules/@apollo/client/link/core/ApolloLink.d.ts:7
