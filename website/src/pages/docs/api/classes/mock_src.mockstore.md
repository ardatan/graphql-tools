[graphql-tools-monorepo](../README) / [mock/src](../modules/mock_src) / MockStore

# Class: MockStore

[mock/src](../modules/mock_src).MockStore

## Implements

- [`IMockStore`](/docs/api/interfaces/mock_src.IMockStore)

## Table of contents

### Constructors

- [constructor](mock_src.MockStore#constructor)

### Properties

- [schema](mock_src.MockStore#schema)

### Methods

- [filter](mock_src.MockStore#filter)
- [find](mock_src.MockStore#find)
- [get](mock_src.MockStore#get)
- [has](mock_src.MockStore#has)
- [reset](mock_src.MockStore#reset)
- [set](mock_src.MockStore#set)

## Constructors

### constructor

• **new MockStore**(`«destructured»`)

#### Parameters

| Name              | Type                                   |
| :---------------- | :------------------------------------- |
| `«destructured»`  | `Object`                               |
| › `mocks?`        | [`IMocks`](../modules/mock_src#imocks) |
| › `schema`        | `GraphQLSchema`                        |
| › `typePolicies?` | `Object`                               |

#### Defined in

[packages/mock/src/MockStore.ts:56](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/MockStore.ts#L56)

## Properties

### schema

• **schema**: `GraphQLSchema`

#### Implementation of

[IMockStore](/docs/api/interfaces/mock_src.IMockStore).[schema](/docs/api/interfaces/mock_src.IMockStore#schema)

#### Defined in

[packages/mock/src/MockStore.ts:48](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/MockStore.ts#L48)

## Methods

### filter

▸ **filter**(`key`, `predicate`): `Entity`[]

#### Parameters

| Name        | Type                           |
| :---------- | :----------------------------- |
| `key`       | `string`                       |
| `predicate` | (`val`: `Entity`) => `boolean` |

#### Returns

`Entity`[]

#### Defined in

[packages/mock/src/MockStore.ts:193](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/MockStore.ts#L193)

---

### find

▸ **find**(`key`, `predicate`): `undefined` \| `Entity`

#### Parameters

| Name        | Type                           |
| :---------- | :----------------------------- |
| `key`       | `string`                       |
| `predicate` | (`val`: `Entity`) => `boolean` |

#### Returns

`undefined` \| `Entity`

#### Defined in

[packages/mock/src/MockStore.ts:198](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/MockStore.ts#L198)

---

### get

▸ **get**<`KeyT`, `ReturnKeyT`\>(`_typeName`, `_key?`, `_fieldName?`, `_fieldArgs?`): `unknown`

Get a field value from the store for the given type, key and field name — and optionally field
arguments. If the field name is not given, a reference to the type will be returned.

If the the value for this field is not set, a value will be generated according to field return type
and mock functions.

If the field's output type is a `ObjectType` (or list of `ObjectType`), it will return a `Ref` (or
array of `Ref`), ie a reference to an entity in the store.

Example:

```ts
store.get('Query', 'ROOT', 'viewer');
> { $ref: { key: 'abc-737dh-djdjd', typeName: 'User' } }
store.get('User', 'abc-737dh-djdjd', 'name')
> "Hello World"
```

#### Type parameters

| Name         | Type                                                                              |
| :----------- | :-------------------------------------------------------------------------------- |
| `KeyT`       | extends [`KeyTypeConstraints`](../modules/mock_src#keytypeconstraints) = `string` |
| `ReturnKeyT` | extends [`KeyTypeConstraints`](../modules/mock_src#keytypeconstraints) = `string` |

#### Parameters

| Name          | Type                                                                                                       |
| :------------ | :--------------------------------------------------------------------------------------------------------- |
| `_typeName`   | `string` \| [`Ref`](../modules/mock_src#ref)\<`KeyT`> \| [`GetArgs`](../modules/mock_src#getargs)\<`KeyT`> |
| `_key?`       | `string` \| `string`[] \| `KeyT` \| \{ `[fieldName: string]`: `any`; }                                     |
| `_fieldName?` | `string` \| `string`[] \| \{ `[fieldName: string]`: `any`; } \| \{ `[argName: string]`: `any`; }           |
| `_fieldArgs?` | `string` \| \{ `[argName: string]`: `any`; }                                                               |

#### Returns

`unknown`

#### Implementation of

[IMockStore](/docs/api/interfaces/mock_src.IMockStore).[get](/docs/api/interfaces/mock_src.IMockStore#get)

#### Defined in

[packages/mock/src/MockStore.ts:76](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/MockStore.ts#L76)

---

### has

▸ **has**<`KeyT`\>(`typeName`, `key`): `boolean`

Checks if a mock is present in the store for the given typeName and key.

#### Type parameters

| Name   | Type                                                                              |
| :----- | :-------------------------------------------------------------------------------- |
| `KeyT` | extends [`KeyTypeConstraints`](../modules/mock_src#keytypeconstraints) = `string` |

#### Parameters

| Name       | Type     |
| :--------- | :------- |
| `typeName` | `string` |
| `key`      | `KeyT`   |

#### Returns

`boolean`

#### Implementation of

[IMockStore](/docs/api/interfaces/mock_src.IMockStore).[has](/docs/api/interfaces/mock_src.IMockStore#has)

#### Defined in

[packages/mock/src/MockStore.ts:72](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/MockStore.ts#L72)

---

### reset

▸ **reset**(): `void`

Resets the mock store

#### Returns

`void`

#### Implementation of

[IMockStore](/docs/api/interfaces/mock_src.IMockStore).[reset](/docs/api/interfaces/mock_src.IMockStore#reset)

#### Defined in

[packages/mock/src/MockStore.ts:189](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/MockStore.ts#L189)

---

### set

▸ **set**<`KeyT`\>(`_typeName`, `_key?`, `_fieldName?`, `_value?`): `void`

Set a field value in the store for the given type, key and field name — and optionally field
arguments.

If the the field return type is an `ObjectType` or a list of `ObjectType`, you can set references to
other entity as value:

```ts
// set the viewer name
store.set('User', 1, 'name', 'Alexandre);
store.set('Query', 'ROOT', 'viewer', store.get('User', 1));

// set the friends of viewer
store.set('User', 2, 'name', 'Emily');
store.set('User', 3, 'name', 'Caroline');
store.set('User', 1, 'friends', [store.get('User', 2), store.get('User', 3)]);
```

But it also supports nested set:

```ts
store.set('Query', 'ROOT', 'viewer', {
 name: 'Alexandre',
 friends: [
   { name: 'Emily' }
   { name: 'Caroline }
 ]
});
```

#### Type parameters

| Name   | Type                                                                   |
| :----- | :--------------------------------------------------------------------- |
| `KeyT` | extends [`KeyTypeConstraints`](../modules/mock_src#keytypeconstraints) |

#### Parameters

| Name          | Type                                                                                                       |
| :------------ | :--------------------------------------------------------------------------------------------------------- |
| `_typeName`   | `string` \| [`Ref`](../modules/mock_src#ref)\<`KeyT`> \| [`SetArgs`](../modules/mock_src#setargs)\<`KeyT`> |
| `_key?`       | `string` \| `KeyT` \| \{ `[fieldName: string]`: `any`; }                                                   |
| `_fieldName?` | `unknown`                                                                                                  |
| `_value?`     | `unknown`                                                                                                  |

#### Returns

`void`

#### Implementation of

[IMockStore](/docs/api/interfaces/mock_src.IMockStore).[set](/docs/api/interfaces/mock_src.IMockStore#set)

#### Defined in

[packages/mock/src/MockStore.ts:143](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/MockStore.ts#L143)
