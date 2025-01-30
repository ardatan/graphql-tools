[graphql-tools-monorepo](../README) / [mock/src](../modules/mock_src) / IMockStore

# Interface: IMockStore

[mock/src](../modules/mock_src).IMockStore

## Implemented by

- [`MockStore`](/docs/api/classes/mock_src.MockStore)

## Table of contents

### Properties

- [schema](mock_src.IMockStore#schema)

### Methods

- [get](mock_src.IMockStore#get)
- [has](mock_src.IMockStore#has)
- [reset](mock_src.IMockStore#reset)
- [set](mock_src.IMockStore#set)

## Properties

### schema

• **schema**: `GraphQLSchema`

#### Defined in

[packages/mock/src/types.ts:83](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L83)

## Methods

### get

▸ **get**<`KeyT`, `ReturnKeyT`\>(`args`): `unknown`

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

| Name   | Type                                              |
| :----- | :------------------------------------------------ |
| `args` | [`GetArgs`](../modules/mock_src#getargs)\<`KeyT`> |

#### Returns

`unknown`

#### Defined in

[packages/mock/src/types.ts:104](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L104)

▸ **get**<`KeyT`, `ReturnKeyT`\>(`typeName`, `key`, `fieldNameOrFieldNames`, `fieldArgs?`):
`unknown`

Shorthand for `get({typeName, key, fieldName, fieldArgs})`.

#### Type parameters

| Name         | Type                                                                              |
| :----------- | :-------------------------------------------------------------------------------- |
| `KeyT`       | extends [`KeyTypeConstraints`](../modules/mock_src#keytypeconstraints) = `string` |
| `ReturnKeyT` | extends [`KeyTypeConstraints`](../modules/mock_src#keytypeconstraints) = `string` |

#### Parameters

| Name                    | Type                                         |
| :---------------------- | :------------------------------------------- |
| `typeName`              | `string`                                     |
| `key`                   | `KeyT`                                       |
| `fieldNameOrFieldNames` | `string` \| `string`[]                       |
| `fieldArgs?`            | `string` \| \{ `[argName: string]`: `any`; } |

#### Returns

`unknown`

#### Defined in

[packages/mock/src/types.ts:110](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L110)

▸ **get**<`KeyT`\>(`typeName`, `keyOrDefaultValue?`, `defaultValue?`): `unknown`

Get a reference to the type.

#### Type parameters

| Name   | Type                                                                              |
| :----- | :-------------------------------------------------------------------------------- |
| `KeyT` | extends [`KeyTypeConstraints`](../modules/mock_src#keytypeconstraints) = `string` |

#### Parameters

| Name                 | Type                                         |
| :------------------- | :------------------------------------------- |
| `typeName`           | `string`                                     |
| `keyOrDefaultValue?` | `KeyT` \| \{ `[fieldName: string]`: `any`; } |
| `defaultValue?`      | `Object`                                     |

#### Returns

`unknown`

#### Defined in

[packages/mock/src/types.ts:119](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L119)

▸ **get**<`KeyT`, `ReturnKeyT`\>(`ref`, `fieldNameOrFieldNames`, `fieldArgs?`): `unknown`

Shorthand for `get({typeName: ref.$ref.typeName, key: ref.$ref.key, fieldName, fieldArgs})`

#### Type parameters

| Name         | Type                                                                              |
| :----------- | :-------------------------------------------------------------------------------- |
| `KeyT`       | extends [`KeyTypeConstraints`](../modules/mock_src#keytypeconstraints) = `string` |
| `ReturnKeyT` | extends [`KeyTypeConstraints`](../modules/mock_src#keytypeconstraints) = `string` |

#### Parameters

| Name                    | Type                                         |
| :---------------------- | :------------------------------------------- |
| `ref`                   | [`Ref`](../modules/mock_src#ref)\<`KeyT`>    |
| `fieldNameOrFieldNames` | `string` \| `string`[]                       |
| `fieldArgs?`            | `string` \| \{ `[argName: string]`: `any`; } |

#### Returns

`unknown`

#### Defined in

[packages/mock/src/types.ts:131](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L131)

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

#### Defined in

[packages/mock/src/types.ts:208](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L208)

---

### reset

▸ **reset**(): `void`

Resets the mock store

#### Returns

`void`

#### Defined in

[packages/mock/src/types.ts:213](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L213)

---

### set

▸ **set**<`KeyT`\>(`args`): `void`

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

| Name   | Type                                                                              |
| :----- | :-------------------------------------------------------------------------------- |
| `KeyT` | extends [`KeyTypeConstraints`](../modules/mock_src#keytypeconstraints) = `string` |

#### Parameters

| Name   | Type                                              |
| :----- | :------------------------------------------------ |
| `args` | [`SetArgs`](../modules/mock_src#setargs)\<`KeyT`> |

#### Returns

`void`

#### Defined in

[packages/mock/src/types.ts:167](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L167)

▸ **set**<`KeyT`\>(`typeName`, `key`, `fieldName`, `value?`): `void`

Shorthand for `set({typeName, key, fieldName, value})`.

#### Type parameters

| Name   | Type                                                                              |
| :----- | :-------------------------------------------------------------------------------- |
| `KeyT` | extends [`KeyTypeConstraints`](../modules/mock_src#keytypeconstraints) = `string` |

#### Parameters

| Name        | Type      |
| :---------- | :-------- |
| `typeName`  | `string`  |
| `key`       | `KeyT`    |
| `fieldName` | `string`  |
| `value?`    | `unknown` |

#### Returns

`void`

#### Defined in

[packages/mock/src/types.ts:172](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L172)

▸ **set**<`KeyT`\>(`typeName`, `key`, `values`): `void`

Set the given field values to the type with key.

#### Type parameters

| Name   | Type                                                                              |
| :----- | :-------------------------------------------------------------------------------- |
| `KeyT` | extends [`KeyTypeConstraints`](../modules/mock_src#keytypeconstraints) = `string` |

#### Parameters

| Name       | Type     |
| :--------- | :------- |
| `typeName` | `string` |
| `key`      | `KeyT`   |
| `values`   | `Object` |

#### Returns

`void`

#### Defined in

[packages/mock/src/types.ts:182](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L182)

▸ **set**<`KeyT`\>(`ref`, `fieldName`, `value?`): `void`

Shorthand for `set({ref.$ref.typeName, ref.$ref.key, fieldName, value})`.

#### Type parameters

| Name   | Type                                                                              |
| :----- | :-------------------------------------------------------------------------------- |
| `KeyT` | extends [`KeyTypeConstraints`](../modules/mock_src#keytypeconstraints) = `string` |

#### Parameters

| Name        | Type                                      |
| :---------- | :---------------------------------------- |
| `ref`       | [`Ref`](../modules/mock_src#ref)\<`KeyT`> |
| `fieldName` | `string`                                  |
| `value?`    | `unknown`                                 |

#### Returns

`void`

#### Defined in

[packages/mock/src/types.ts:191](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L191)

▸ **set**<`KeyT`\>(`ref`, `values`): `void`

Set the given field values to the type with ref.

#### Type parameters

| Name   | Type                                                                              |
| :----- | :-------------------------------------------------------------------------------- |
| `KeyT` | extends [`KeyTypeConstraints`](../modules/mock_src#keytypeconstraints) = `string` |

#### Parameters

| Name     | Type                                      |
| :------- | :---------------------------------------- |
| `ref`    | [`Ref`](../modules/mock_src#ref)\<`KeyT`> |
| `values` | `Object`                                  |

#### Returns

`void`

#### Defined in

[packages/mock/src/types.ts:200](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L200)
