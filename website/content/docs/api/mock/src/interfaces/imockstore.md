---
title: "IMockStore"
description: "The IMockStore interface exported by @graphql-tools/mock."
---

Defined in: [packages/mock/src/types.ts:83](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L83)

## Properties

### schema

> **schema**: `GraphQLSchema`

Defined in: [packages/mock/src/types.ts:84](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L84)

## Methods

### get()

#### Call Signature

> **get**\<`KeyT`, `ReturnKeyT`\>(`args`): `unknown`

Defined in: [packages/mock/src/types.ts:105](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L105)

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

##### Type Parameters

###### KeyT

`KeyT` *extends* [`KeyTypeConstraints`](/docs/api/mock/src/type-aliases/keytypeconstraints) = `string`

###### ReturnKeyT

`ReturnKeyT` *extends* [`KeyTypeConstraints`](/docs/api/mock/src/type-aliases/keytypeconstraints) = `string`

##### Parameters

###### args

[`GetArgs`](/docs/api/mock/src/type-aliases/getargs)\<`KeyT`\>

##### Returns

`unknown`

#### Call Signature

> **get**\<`KeyT`, `ReturnKeyT`\>(`typeName`, `key`, `fieldNameOrFieldNames`, `fieldArgs?`): `unknown`

Defined in: [packages/mock/src/types.ts:111](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L111)

Shorthand for `get({typeName, key, fieldName, fieldArgs})`.

##### Type Parameters

###### KeyT

`KeyT` *extends* [`KeyTypeConstraints`](/docs/api/mock/src/type-aliases/keytypeconstraints) = `string`

###### ReturnKeyT

`ReturnKeyT` *extends* [`KeyTypeConstraints`](/docs/api/mock/src/type-aliases/keytypeconstraints) = `string`

##### Parameters

###### typeName

`string`

###### key

`KeyT`

###### fieldNameOrFieldNames

`string` \| `string`[]

###### fieldArgs?

`string` \| \{\[`argName`: `string`\]: `any`; \}

##### Returns

`unknown`

#### Call Signature

> **get**\<`KeyT`\>(`typeName`, `keyOrDefaultValue?`, `defaultValue?`): `unknown`

Defined in: [packages/mock/src/types.ts:120](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L120)

Get a reference to the type.

##### Type Parameters

###### KeyT

`KeyT` *extends* [`KeyTypeConstraints`](/docs/api/mock/src/type-aliases/keytypeconstraints) = `string`

##### Parameters

###### typeName

`string`

###### keyOrDefaultValue?

`KeyT` \| \{\[`fieldName`: `string`\]: `any`; \}

###### defaultValue?

##### Returns

`unknown`

#### Call Signature

> **get**\<`KeyT`, `ReturnKeyT`\>(`ref`, `fieldNameOrFieldNames`, `fieldArgs?`): `unknown`

Defined in: [packages/mock/src/types.ts:132](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L132)

Shorthand for `get({typeName: ref.$ref.typeName, key: ref.$ref.key, fieldName, fieldArgs})`

##### Type Parameters

###### KeyT

`KeyT` *extends* [`KeyTypeConstraints`](/docs/api/mock/src/type-aliases/keytypeconstraints) = `string`

###### ReturnKeyT

`ReturnKeyT` *extends* [`KeyTypeConstraints`](/docs/api/mock/src/type-aliases/keytypeconstraints) = `string`

##### Parameters

###### ref

[`Ref`](/docs/api/mock/src/type-aliases/ref)\<`KeyT`\>

###### fieldNameOrFieldNames

`string` \| `string`[]

###### fieldArgs?

`string` \| \{\[`argName`: `string`\]: `any`; \}

##### Returns

`unknown`

***

### has()

> **has**\<`KeyT`\>(`typeName`, `key`): `boolean`

Defined in: [packages/mock/src/types.ts:209](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L209)

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

***

### reset()

> **reset**(): `void`

Defined in: [packages/mock/src/types.ts:214](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L214)

Resets the mock store

#### Returns

`void`

***

### set()

#### Call Signature

> **set**\<`KeyT`\>(`args`): `void`

Defined in: [packages/mock/src/types.ts:168](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L168)

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

##### Type Parameters

###### KeyT

`KeyT` *extends* [`KeyTypeConstraints`](/docs/api/mock/src/type-aliases/keytypeconstraints) = `string`

##### Parameters

###### args

[`SetArgs`](/docs/api/mock/src/type-aliases/setargs)\<`KeyT`\>

##### Returns

`void`

#### Call Signature

> **set**\<`KeyT`\>(`typeName`, `key`, `fieldName`, `value?`): `void`

Defined in: [packages/mock/src/types.ts:173](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L173)

Shorthand for `set({typeName, key, fieldName, value})`.

##### Type Parameters

###### KeyT

`KeyT` *extends* [`KeyTypeConstraints`](/docs/api/mock/src/type-aliases/keytypeconstraints) = `string`

##### Parameters

###### typeName

`string`

###### key

`KeyT`

###### fieldName

`string`

###### value?

`unknown`

##### Returns

`void`

#### Call Signature

> **set**\<`KeyT`\>(`typeName`, `key`, `values`): `void`

Defined in: [packages/mock/src/types.ts:183](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L183)

Set the given field values to the type with key.

##### Type Parameters

###### KeyT

`KeyT` *extends* [`KeyTypeConstraints`](/docs/api/mock/src/type-aliases/keytypeconstraints) = `string`

##### Parameters

###### typeName

`string`

###### key

`KeyT`

###### values

##### Returns

`void`

#### Call Signature

> **set**\<`KeyT`\>(`ref`, `fieldName`, `value?`): `void`

Defined in: [packages/mock/src/types.ts:192](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L192)

Shorthand for `set({ref.$ref.typeName, ref.$ref.key, fieldName, value})`.

##### Type Parameters

###### KeyT

`KeyT` *extends* [`KeyTypeConstraints`](/docs/api/mock/src/type-aliases/keytypeconstraints) = `string`

##### Parameters

###### ref

[`Ref`](/docs/api/mock/src/type-aliases/ref)\<`KeyT`\>

###### fieldName

`string`

###### value?

`unknown`

##### Returns

`void`

#### Call Signature

> **set**\<`KeyT`\>(`ref`, `values`): `void`

Defined in: [packages/mock/src/types.ts:201](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/types.ts#L201)

Set the given field values to the type with ref.

##### Type Parameters

###### KeyT

`KeyT` *extends* [`KeyTypeConstraints`](/docs/api/mock/src/type-aliases/keytypeconstraints) = `string`

##### Parameters

###### ref

[`Ref`](/docs/api/mock/src/type-aliases/ref)\<`KeyT`\>

###### values

##### Returns

`void`
