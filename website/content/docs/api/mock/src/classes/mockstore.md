---
title: "MockStore"
description: "The MockStore class exported by @graphql-tools/mock."
---

Defined in: [packages/mock/src/MockStore.ts:57](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/MockStore.ts#L57)

## Implements

- [`IMockStore`](/docs/api/mock/src/interfaces/imockstore)

## Constructors

### Constructor

> **new MockStore**(`__namedParameters`): `MockStore`

Defined in: [packages/mock/src/MockStore.ts:67](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/MockStore.ts#L67)

#### Parameters

##### \_\_namedParameters

###### mockGenerationBehavior?

[`MockGenerationBehavior`](/docs/api/mock/src/type-aliases/mockgenerationbehavior) = `'random'`

###### mocks?

[`IMocks`](/docs/api/mock/src/type-aliases/imocks)

###### schema

`GraphQLSchema`

###### typePolicies?

\{\[`typeName`: `string`\]: [`TypePolicy`](/docs/api/mock/src/type-aliases/typepolicy); \}

#### Returns

`MockStore`

## Properties

### schema

> **schema**: `GraphQLSchema`

Defined in: [packages/mock/src/MockStore.ts:58](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/MockStore.ts#L58)

#### Implementation of

[`IMockStore`](/docs/api/mock/src/interfaces/imockstore).[`schema`](/docs/api/mock/src/interfaces/imockstore#schema)

## Methods

### filter()

> **filter**(`key`, `predicate`): `Entity`[]

Defined in: [packages/mock/src/MockStore.ts:207](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/MockStore.ts#L207)

#### Parameters

##### key

`string`

##### predicate

(`val`) => `boolean`

#### Returns

`Entity`[]

***

### find()

> **find**(`key`, `predicate`): `Entity` \| `undefined`

Defined in: [packages/mock/src/MockStore.ts:212](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/MockStore.ts#L212)

#### Parameters

##### key

`string`

##### predicate

(`val`) => `boolean`

#### Returns

`Entity` \| `undefined`

***

### get()

> **get**\<`KeyT`, `ReturnKeyT`\>(`_typeName`, `_key?`, `_fieldName?`, `_fieldArgs?`): `unknown`

Defined in: [packages/mock/src/MockStore.ts:94](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/MockStore.ts#L94)

Get a field value from the store for the given type, key and field
name — and optionally field arguments. If the field name is not given,
a reference to the type will be returned.

If the the value for this field is not set, a value will be
generated according to field return type and mock functions.

If the field's output type is a `ObjectType` (or list of `ObjectType`),
it will return a `Ref` (or array of `Ref`), ie a reference to an entity
in the store.

Example:
```ts
store.get('Query', 'ROOT', 'viewer');
> { $ref: { key: 'abc-737dh-djdjd', typeName: 'User' } }
store.get('User', 'abc-737dh-djdjd', 'name')
> "Hello World"
```

#### Type Parameters

##### KeyT

`KeyT` *extends* [`KeyTypeConstraints`](/docs/api/mock/src/type-aliases/keytypeconstraints) = `string`

##### ReturnKeyT

`ReturnKeyT` *extends* [`KeyTypeConstraints`](/docs/api/mock/src/type-aliases/keytypeconstraints) = `string`

#### Parameters

##### \_typeName

`string` \| [`Ref`](/docs/api/mock/src/type-aliases/ref)\<`KeyT`\> \| [`GetArgs`](/docs/api/mock/src/type-aliases/getargs)\<`KeyT`\>

##### \_key?

`string` \| `string`[] \| `KeyT` \| \{\[`fieldName`: `string`\]: `any`; \}

##### \_fieldName?

`string` \| `string`[] \| \{\[`fieldName`: `string`\]: `any`; \} \| \{\[`argName`: `string`\]: `any`; \}

##### \_fieldArgs?

`string` \| \{\[`argName`: `string`\]: `any`; \}

#### Returns

`unknown`

#### Implementation of

[`IMockStore`](/docs/api/mock/src/interfaces/imockstore).[`get`](/docs/api/mock/src/interfaces/imockstore#get)

***

### has()

> **has**\<`KeyT`\>(`typeName`, `key`): `boolean`

Defined in: [packages/mock/src/MockStore.ts:90](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/MockStore.ts#L90)

Checks if a mock is present in the store for the given typeName and key.

#### Type Parameters

##### KeyT

`KeyT` *extends* [`KeyTypeConstraints`](/docs/api/mock/src/type-aliases/keytypeconstraints) = `string`

#### Parameters

##### typeName

`string`

##### key

`KeyT`

#### Returns

`boolean`

#### Implementation of

[`IMockStore`](/docs/api/mock/src/interfaces/imockstore).[`has`](/docs/api/mock/src/interfaces/imockstore#has)

***

### reset()

> **reset**(): `void`

Defined in: [packages/mock/src/MockStore.ts:203](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/MockStore.ts#L203)

Resets the mock store

#### Returns

`void`

#### Implementation of

[`IMockStore`](/docs/api/mock/src/interfaces/imockstore).[`reset`](/docs/api/mock/src/interfaces/imockstore#reset)

***

### set()

> **set**\<`KeyT`\>(`_typeName`, `_key?`, `_fieldName?`, `_value?`): `void`

Defined in: [packages/mock/src/MockStore.ts:157](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/MockStore.ts#L157)

Set a field value in the store for the given type, key and field
name — and optionally field arguments.

If the the field return type is an `ObjectType` or a list of
`ObjectType`, you can set references to other entity as value:

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

#### Type Parameters

##### KeyT

`KeyT` *extends* [`KeyTypeConstraints`](/docs/api/mock/src/type-aliases/keytypeconstraints)

#### Parameters

##### \_typeName

`string` \| [`Ref`](/docs/api/mock/src/type-aliases/ref)\<`KeyT`\> \| [`SetArgs`](/docs/api/mock/src/type-aliases/setargs)\<`KeyT`\>

##### \_key?

`string` \| `KeyT` \| \{\[`fieldName`: `string`\]: `any`; \}

##### \_fieldName?

`unknown`

##### \_value?

`unknown`

#### Returns

`void`

#### Implementation of

[`IMockStore`](/docs/api/mock/src/interfaces/imockstore).[`set`](/docs/api/mock/src/interfaces/imockstore#set)
