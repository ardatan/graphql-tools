# @graphql-tools/mock

### Classes

- [MockList](/docs/api/classes/mock_src.MockList)
- [MockStore](/docs/api/classes/mock_src.MockStore)

### Interfaces

- [IMockServer](/docs/api/interfaces/mock_src.IMockServer)
- [IMockStore](/docs/api/interfaces/mock_src.IMockStore)

### Type Aliases

- [AllNodesFn](mock_src#allnodesfn)
- [GetArgs](mock_src#getargs)
- [IMockFn](mock_src#imockfn)
- [IMocks](mock_src#imocks)
- [IScalarMock](mock_src#iscalarmock)
- [ITypeMock](mock_src#itypemock)
- [KeyTypeConstraints](mock_src#keytypeconstraints)
- [Ref](mock_src#ref)
- [RelayPageInfo](mock_src#relaypageinfo)
- [RelayPaginationParams](mock_src#relaypaginationparams)
- [RelayStylePaginationMockOptions](mock_src#relaystylepaginationmockoptions)
- [SetArgs](mock_src#setargs)
- [TypePolicy](mock_src#typepolicy)

### Variables

- [defaultMocks](mock_src#defaultmocks)

### Functions

- [addMocksToSchema](mock_src#addmockstoschema)
- [assertIsRef](mock_src#assertisref)
- [createMockStore](mock_src#createmockstore)
- [deepResolveMockList](mock_src#deepresolvemocklist)
- [isMockList](mock_src#ismocklist)
- [isRecord](mock_src#isrecord)
- [isRef](mock_src#isref)
- [mockServer](mock_src#mockserver)
- [relayStylePaginationMock](mock_src#relaystylepaginationmock)

## Type Aliases

### AllNodesFn

Ƭ **AllNodesFn**\<`TContext`, `TArgs`>: (`parent`: [`Ref`](mock_src#ref), `args`: `TArgs`,
`context`: `TContext`, `info`: `GraphQLResolveInfo`) => [`Ref`](mock_src#ref)[]

#### Type parameters

| Name       | Type                                                              |
| :--------- | :---------------------------------------------------------------- |
| `TContext` | `TContext`                                                        |
| `TArgs`    | extends [`RelayPaginationParams`](mock_src#relaypaginationparams) |

#### Type declaration

▸ (`parent`, `args`, `context`, `info`): [`Ref`](mock_src#ref)[]

##### Parameters

| Name      | Type                  |
| :-------- | :-------------------- |
| `parent`  | [`Ref`](mock_src#ref) |
| `args`    | `TArgs`               |
| `context` | `TContext`            |
| `info`    | `GraphQLResolveInfo`  |

##### Returns

[`Ref`](mock_src#ref)[]

#### Defined in

[packages/mock/src/pagination.ts:6](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/pagination.ts#L6)

---

### GetArgs

Ƭ **GetArgs**\<`KeyT`>: `Object`

#### Type parameters

| Name   | Type                                                                   |
| :----- | :--------------------------------------------------------------------- |
| `KeyT` | extends [`KeyTypeConstraints`](mock_src#keytypeconstraints) = `string` |

#### Type declaration

| Name            | Type                                            | Description                                                                                                                                                                                                                                                                                                                                                                                                       |
| :-------------- | :---------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `defaultValue?` | `unknown` \| \{ `[fieldName: string]`: `any`; } | If no value found, insert the `defaultValue`.                                                                                                                                                                                                                                                                                                                                                                     |
| `fieldArgs?`    | `string` \| \{ `[argName: string]`: `any`; }    | Optional arguments when querying the field. Querying the field with the same arguments will return the same value. Deep equality is checked. `ts store.get('User', 1, 'friend', { id: 2 }) === store.get('User', 1, 'friend', { id: 2 }) store.get('User', 1, 'friend', { id: 2 }) !== store.get('User', 1, 'friend') ` Args can be a record, just like `args` argument of field resolver or an arbitrary string. |
| `fieldName?`    | `string`                                        | -                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `key?`          | `KeyT`                                          | -                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `typeName`      | `string`                                        | -                                                                                                                                                                                                                                                                                                                                                                                                                 |

#### Defined in

[packages/mock/src/types.ts:37](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L37)

---

### IMockFn

Ƭ **IMockFn**: () => `unknown`

#### Type declaration

▸ (): `unknown`

##### Returns

`unknown`

#### Defined in

[packages/mock/src/types.ts:4](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L4)

---

### IMocks

Ƭ **IMocks**\<`TResolvers`>: \{ [TTypeName in keyof TResolvers]?: \{ [TFieldName in keyof
TResolvers[TTypeName]]: TResolvers[TTypeName][TFieldName] extends Function ? Function :
TResolvers[TTypeName][TFieldName] } } & \{ `[typeOrScalarName: string]`:
[`IScalarMock`](mock_src#iscalarmock) \| [`ITypeMock`](mock_src#itypemock); }

#### Type parameters

| Name         | Type                                 |
| :----------- | :----------------------------------- |
| `TResolvers` | [`IResolvers`](utils_src#iresolvers) |

#### Defined in

[packages/mock/src/types.ts:10](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L10)

---

### IScalarMock

Ƭ **IScalarMock**: `unknown` \| [`IMockFn`](mock_src#imockfn)

#### Defined in

[packages/mock/src/types.ts:5](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L5)

---

### ITypeMock

Ƭ **ITypeMock**: () => \{ `[fieldName: string]`: `unknown` \| [`IMockFn`](mock_src#imockfn); } \| \{
`[fieldName: string]`: [`IMockFn`](mock_src#imockfn); }

#### Type declaration

▸ (): \{ `[fieldName: string]`: `unknown` \| [`IMockFn`](mock_src#imockfn); } \| \{
`[fieldName: string]`: [`IMockFn`](mock_src#imockfn); }

##### Returns

\{ `[fieldName: string]`: `unknown` \| [`IMockFn`](mock_src#imockfn); } \| \{ `[fieldName: string]`:
[`IMockFn`](mock_src#imockfn); }

#### Defined in

[packages/mock/src/types.ts:6](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L6)

---

### KeyTypeConstraints

Ƭ **KeyTypeConstraints**: `string` \| `number`

#### Defined in

[packages/mock/src/types.ts:24](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L24)

---

### Ref

Ƭ **Ref**\<`KeyT`>: `Object`

#### Type parameters

| Name   | Type                                                                   |
| :----- | :--------------------------------------------------------------------- |
| `KeyT` | extends [`KeyTypeConstraints`](mock_src#keytypeconstraints) = `string` |

#### Type declaration

| Name            | Type                                      |
| :-------------- | :---------------------------------------- |
| `$ref`          | \{ `key`: `KeyT` ; `typeName`: `string` } |
| `$ref.key`      | `KeyT`                                    |
| `$ref.typeName` | `string`                                  |

#### Defined in

[packages/mock/src/types.ts:216](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L216)

---

### RelayPageInfo

Ƭ **RelayPageInfo**: `Object`

#### Type declaration

| Name              | Type      |
| :---------------- | :-------- |
| `endCursor`       | `string`  |
| `hasNextPage`     | `boolean` |
| `hasPreviousPage` | `boolean` |
| `startCursor`     | `string`  |

#### Defined in

[packages/mock/src/pagination.ts:77](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/pagination.ts#L77)

---

### RelayPaginationParams

Ƭ **RelayPaginationParams**: `Object`

#### Type declaration

| Name      | Type     |
| :-------- | :------- |
| `after?`  | `string` |
| `before?` | `string` |
| `first?`  | `number` |
| `last?`   | `number` |

#### Defined in

[packages/mock/src/pagination.ts:70](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/pagination.ts#L70)

---

### RelayStylePaginationMockOptions

Ƭ **RelayStylePaginationMockOptions**\<`TContext`, `TArgs`>: `Object`

#### Type parameters

| Name       | Type                                                              |
| :--------- | :---------------------------------------------------------------- |
| `TContext` | `TContext`                                                        |
| `TArgs`    | extends [`RelayPaginationParams`](mock_src#relaypaginationparams) |

#### Type declaration

| Name            | Type                                                                              | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| :-------------- | :-------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `allNodesFn?`   | [`AllNodesFn`](mock_src#allnodesfn)\<`TContext`, `TArgs`>                         | A function that'll be used to get all the nodes used for pagination. By default, it will use the nodes of the field this pagination is attached to. This option is handy when several paginable fields should share the same base nodes: `ts { User: { friends: mockedRelayStylePagination(store), maleFriends: mockedRelayStylePagination(store, { allNodesFn: (userRef) => store .get(userRef, ['friends', 'edges']) .map((e) => store.get(e, 'node')) .filter((userRef) => store.get(userRef, 'sex') === 'male') }) } } ` |
| `applyOnNodes?` | (`nodeRefs`: [`Ref`](mock_src#ref)[], `args`: `TArgs`) => [`Ref`](mock_src#ref)[] | Use this option to apply filtering or sorting on the nodes given the arguments the paginated field receives. `ts { User: { friends: mockedRelayStylePagination< unknown, RelayPaginationParams & { sortByBirthdateDesc?: boolean} >( store, { applyOnEdges: (edges, { sortByBirthdateDesc }) => { if (!sortByBirthdateDesc) return edges return _.sortBy(edges, (e) => store.get(e, ['node', 'birthdate'])) } }), } } `                                                                                                      |
| `cursorFn?`     | (`nodeRef`: [`Ref`](mock_src#ref)) => `string`                                    | The function that'll be used to compute the cursor of a node. By default, it'll use `MockStore` internal reference `Ref`'s `key` as cursor.                                                                                                                                                                                                                                                                                                                                                                                  |

#### Defined in

[packages/mock/src/pagination.ts:13](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/pagination.ts#L13)

---

### SetArgs

Ƭ **SetArgs**\<`KeyT`>: `Object`

#### Type parameters

| Name   | Type                                                                   |
| :----- | :--------------------------------------------------------------------- |
| `KeyT` | extends [`KeyTypeConstraints`](mock_src#keytypeconstraints) = `string` |

#### Type declaration

| Name          | Type                                            | Description                                                                                          |
| :------------ | :---------------------------------------------- | :--------------------------------------------------------------------------------------------------- |
| `fieldArgs?`  | `string` \| \{ `[argName: string]`: `any`; }    | Optional arguments when querying the field. **`See`** GetArgs#fieldArgs                              |
| `fieldName?`  | `string`                                        | -                                                                                                    |
| `key`         | `KeyT`                                          | -                                                                                                    |
| `noOverride?` | `boolean`                                       | If the value for this field is already set, it won't be overridden. Propagates down do nested `set`. |
| `typeName`    | `string`                                        | -                                                                                                    |
| `value?`      | `unknown` \| \{ `[fieldName: string]`: `any`; } | -                                                                                                    |

#### Defined in

[packages/mock/src/types.ts:62](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L62)

---

### TypePolicy

Ƭ **TypePolicy**: `Object`

#### Type declaration

| Name            | Type                | Description                                                                                                                                                                  |
| :-------------- | :------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `keyFieldName?` | `string` \| `false` | The name of the field that should be used as store `key`. If `false`, no field will be used and `id` or `_id` will be used, otherwise we'll generate a random string as key. |

#### Defined in

[packages/mock/src/types.ts:26](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L26)

## Variables

### defaultMocks

• `Const` **defaultMocks**: `Object`

#### Type declaration

| Name      | Type            |
| :-------- | :-------------- |
| `Boolean` | () => `boolean` |
| `Float`   | () => `number`  |
| `ID`      | () => `string`  |
| `Int`     | () => `number`  |
| `String`  | () => `string`  |

#### Defined in

[packages/mock/src/MockStore.ts:33](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/MockStore.ts#L33)

## Functions

### addMocksToSchema

▸ **addMocksToSchema**<`TResolvers`\>(`«destructured»`): `GraphQLSchema`

Given a `schema` and a `MockStore`, returns an executable schema that will use the provided
`MockStore` to execute queries.

```ts
const schema = buildSchema(`
 type User {
   id: ID!
   name: String!
 }
 type Query {
   me: User!
 }
`)

const store = createMockStore({ schema })
const mockedSchema = addMocksToSchema({ schema, store })
```

If a `resolvers` parameter is passed, the query execution will use the provided `resolvers` if, one
exists, instead of the default mock resolver.

```ts
const schema = buildSchema(`
  type User {
    id: ID!
    name: String!
  }
  type Query {
    me: User!
  }
  type Mutation {
    setMyName(newName: String!): User!
  }
`)

const store = createMockStore({ schema })
const mockedSchema = addMocksToSchema({
  schema,
  store,
  resolvers: {
    Mutation: {
      setMyName: (_, { newName }) => {
        const ref = store.get('Query', 'ROOT', 'viewer')
        store.set(ref, 'name', newName)
        return ref
      }
    }
  }
})
```

`Query` and `Mutation` type will use `key` `'ROOT'`.

#### Type parameters

| Name         | Type                                 |
| :----------- | :----------------------------------- |
| `TResolvers` | [`IResolvers`](utils_src#iresolvers) |

#### Parameters

| Name             | Type                          |
| :--------------- | :---------------------------- |
| `«destructured»` | `IMockOptions`\<`TResolvers`> |

#### Returns

`GraphQLSchema`

#### Defined in

[packages/mock/src/addMocksToSchema.ts:92](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/addMocksToSchema.ts#L92)

---

### assertIsRef

▸ **assertIsRef**<`KeyT`\>(`maybeRef`, `message?`): asserts maybeRef is Ref\<KeyT>

#### Type parameters

| Name   | Type                                                                   |
| :----- | :--------------------------------------------------------------------- |
| `KeyT` | extends [`KeyTypeConstraints`](mock_src#keytypeconstraints) = `string` |

#### Parameters

| Name       | Type      |
| :--------- | :-------- |
| `maybeRef` | `unknown` |
| `message?` | `string`  |

#### Returns

asserts maybeRef is Ref\<KeyT>

#### Defined in

[packages/mock/src/types.ts:229](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L229)

---

### createMockStore

▸ **createMockStore**(`options`): [`IMockStore`](/docs/api/interfaces/mock_src.IMockStore)

Will create `MockStore` for the given `schema`.

A `MockStore` will generate mock values for the given schem when queried.

It will stores generated mocks, so that, provided with same arguments the returned values will be
the same.

Its API also allows to modify the stored values.

Basic example:

```ts
store.get('User', 1, 'name')
// > "Hello World"
store.set('User', 1, 'name', 'Alexandre')
store.get('User', 1, 'name')
// > "Alexandre"
```

The storage key will correspond to the "key field" of the type. Field with name `id` or `_id` will
be by default considered as the key field for the type. However, use `typePolicies` to precise the
field to use as key.

#### Parameters

| Name                    | Type                        | Description                     |
| :---------------------- | :-------------------------- | :------------------------------ |
| `options`               | `Object`                    | -                               |
| `options.mocks?`        | [`IMocks`](mock_src#imocks) | The mocks functions to use.     |
| `options.schema`        | `GraphQLSchema`             | The `schema` to based mocks on. |
| `options.typePolicies?` | `Object`                    | -                               |

#### Returns

[`IMockStore`](/docs/api/interfaces/mock_src.IMockStore)

#### Defined in

[packages/mock/src/MockStore.ts:688](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/MockStore.ts#L688)

---

### deepResolveMockList

▸ **deepResolveMockList**(`mockList`): `unknown`[]

#### Parameters

| Name       | Type                                              |
| :--------- | :------------------------------------------------ |
| `mockList` | [`MockList`](/docs/api/classes/mock_src.MockList) |

#### Returns

`unknown`[]

#### Defined in

[packages/mock/src/MockList.ts:72](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/MockList.ts#L72)

---

### isMockList

▸ **isMockList**(`obj`): obj is MockList

#### Parameters

| Name  | Type  |
| :---- | :---- |
| `obj` | `any` |

#### Returns

obj is MockList

#### Defined in

[packages/mock/src/MockList.ts:4](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/MockList.ts#L4)

---

### isRecord

▸ **isRecord**(`obj`): obj is Object

#### Parameters

| Name  | Type      |
| :---- | :-------- |
| `obj` | `unknown` |

#### Returns

obj is Object

#### Defined in

[packages/mock/src/types.ts:238](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L238)

---

### isRef

▸ **isRef**<`KeyT`\>(`maybeRef`): maybeRef is Ref\<KeyT>

#### Type parameters

| Name   | Type                                                                   |
| :----- | :--------------------------------------------------------------------- |
| `KeyT` | extends [`KeyTypeConstraints`](mock_src#keytypeconstraints) = `string` |

#### Parameters

| Name       | Type      |
| :--------- | :-------- |
| `maybeRef` | `unknown` |

#### Returns

maybeRef is Ref\<KeyT>

#### Defined in

[packages/mock/src/types.ts:223](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L223)

---

### mockServer

▸ **mockServer**<`TResolvers`\>(`schema`, `mocks`, `preserveResolvers?`):
[`IMockServer`](/docs/api/interfaces/mock_src.IMockServer)

A convenience wrapper on top of addMocksToSchema. It adds your mock resolvers to your schema and
returns a client that will correctly execute your query with variables. Note: when executing queries
from the returned server, context and root will both equal `{}`.

#### Type parameters

| Name         |
| :----------- |
| `TResolvers` |

#### Parameters

| Name                | Type                                       | Default value | Description                                                                                                                                                |
| :------------------ | :----------------------------------------- | :------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema`            | [`TypeSource`](utils_src#typesource)       | `undefined`   | The schema to which to add mocks. This can also be a set of type definitions instead.                                                                      |
| `mocks`             | [`IMocks`](mock_src#imocks)\<`TResolvers`> | `undefined`   | The mocks to add to the schema.                                                                                                                            |
| `preserveResolvers` | `boolean`                                  | `false`       | Set to `true` to prevent existing resolvers from being overwritten to provide mock data. This can be used to mock some parts of the server and not others. |

#### Returns

[`IMockServer`](/docs/api/interfaces/mock_src.IMockServer)

#### Defined in

[packages/mock/src/mockServer.ts:19](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/mockServer.ts#L19)

---

### relayStylePaginationMock

▸ **relayStylePaginationMock**<`TContext`, `TArgs`\>(`store`, `«destructured»?`):
[`IFieldResolver`](utils_src#ifieldresolver)\<[`Ref`](mock_src#ref), `TContext`, `TArgs`, `any`>

Produces a resolver that'll mock a
[Relay-style cursor pagination](https://relay.dev/graphql/connections.htm).

```ts
const schemaWithMocks = addMocksToSchema({
  schema,
  resolvers: store => ({
    User: {
      friends: relayStylePaginationMock(store)
    }
  })
})
```

#### Type parameters

| Name       | Type                                                                                                                          |
| :--------- | :---------------------------------------------------------------------------------------------------------------------------- |
| `TContext` | `TContext`                                                                                                                    |
| `TArgs`    | extends [`RelayPaginationParams`](mock_src#relaypaginationparams) = [`RelayPaginationParams`](mock_src#relaypaginationparams) |

#### Parameters

| Name             | Type                                                                                                | Description   |
| :--------------- | :-------------------------------------------------------------------------------------------------- | :------------ |
| `store`          | [`IMockStore`](/docs/api/interfaces/mock_src.IMockStore)                                            | the MockStore |
| `«destructured»` | [`RelayStylePaginationMockOptions`](mock_src#relaystylepaginationmockoptions)\<`TContext`, `TArgs`> | -             |

#### Returns

[`IFieldResolver`](utils_src#ifieldresolver)\<[`Ref`](mock_src#ref), `TContext`, `TArgs`, `any`>

#### Defined in

[packages/mock/src/pagination.ts:99](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/pagination.ts#L99)
