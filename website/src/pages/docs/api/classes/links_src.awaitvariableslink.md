[graphql-tools-monorepo](../README) / [links/src](../modules/links_src) / AwaitVariablesLink

# Class: AwaitVariablesLink

[links/src](../modules/links_src).AwaitVariablesLink

## Hierarchy

- `ApolloLink`

  ↳ **`AwaitVariablesLink`**

## Table of contents

### Constructors

- [constructor](links_src.AwaitVariablesLink#constructor)

### Methods

- [concat](links_src.AwaitVariablesLink#concat)
- [request](links_src.AwaitVariablesLink#request)
- [setOnError](links_src.AwaitVariablesLink#setonerror)
- [split](links_src.AwaitVariablesLink#split)
- [concat](links_src.AwaitVariablesLink#concat-1)
- [empty](links_src.AwaitVariablesLink#empty)
- [execute](links_src.AwaitVariablesLink#execute)
- [from](links_src.AwaitVariablesLink#from)
- [split](links_src.AwaitVariablesLink#split-1)

## Constructors

### constructor

• **new AwaitVariablesLink**(`request?`)

#### Parameters

| Name       | Type             |
| :--------- | :--------------- |
| `request?` | `RequestHandler` |

#### Inherited from

apollo.ApolloLink.constructor

#### Defined in

node_modules/@apollo/client/link/core/ApolloLink.d.ts:10

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

▸ **request**(`operation`, `forward`): `Observable`\<`FetchResult`\<`Record`\<`string`, `any`>,
`Record`\<`string`, `any`>, `Record`\<`string`, `any`>>>

#### Parameters

| Name        | Type        |
| :---------- | :---------- |
| `operation` | `Operation` |
| `forward`   | `NextLink`  |

#### Returns

`Observable`\<`FetchResult`\<`Record`\<`string`, `any`>, `Record`\<`string`, `any`>,
`Record`\<`string`, `any`>>>

#### Overrides

apollo.ApolloLink.request

#### Defined in

[packages/links/src/AwaitVariablesLink.ts:30](https://github.com/ardatan/graphql-tools/blob/master/packages/links/src/AwaitVariablesLink.ts#L30)

---

### setOnError

▸ **setOnError**(`fn`): [`AwaitVariablesLink`](links_src.AwaitVariablesLink)

#### Parameters

| Name | Type                                                                           |
| :--- | :----------------------------------------------------------------------------- |
| `fn` | (`error`: `any`, `observer?`: `Observer`\<`FetchResult`>) => `false` \| `void` |

#### Returns

[`AwaitVariablesLink`](links_src.AwaitVariablesLink)

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
