---
title: "createMockStore"
description: "The createMockStore function exported by @graphql-tools/mock."
---

> **createMockStore**(`options`): [`IMockStore`](/docs/api/mock/src/interfaces/imockstore)

Defined in: [packages/mock/src/MockStore.ts:736](https://github.com/ardatan/graphql-tools/blob/master/packages/mock/src/MockStore.ts#L736)

Will create `MockStore` for the given `schema`.

A `MockStore` will generate mock values for the given schema when queried.
By default it'll generate random values, if this causes flakiness and you
need a more deterministic behavior, use `mockGenerationBehavior` option.

It will store generated mocks, so that, provided with same arguments
the returned values will be the same.

Its API also allows to modify the stored values.

Basic example:
```ts
store.get('User', 1, 'name');
// > "Hello World"
store.set('User', 1, 'name', 'Alexandre');
store.get('User', 1, 'name');
// > "Alexandre"
```

The storage key will correspond to the "key field"
of the type. Field with name `id` or `_id` will be
by default considered as the key field for the type.
However, use `typePolicies` to precise the field to use
as key.

## Parameters

### options

#### mockGenerationBehavior?

[`MockGenerationBehavior`](/docs/api/mock/src/type-aliases/mockgenerationbehavior)

Configures the default behavior for Scalar, Enum, Union, and Array types.

When set to `random`, then every time a value is generated for a field with
one of these types
- For Unions and Enums one of the allowed values will be picked randomly
- For Arrays an array of random length will be generated
- For Int and Float scalars a random number will be generated
- For Boolean scalars either `true` or `false` will be returned randomly

When set to `deterministic`, then
- For Unions and Enums the first allowed value is picked
- For Arrays an array of two elements will be generated
- For Int and Float scalars values 1 and 1.5 will be used respectively
- For Boolean scalars we'll always return `true`
- For String scalars we'll always return "Hello World"

Regardless of the chosen behavior, for ID scalars a random UUID string
will always be generated.

**Default**

```ts
"random"
```

#### mocks?

[`IMocks`](/docs/api/mock/src/type-aliases/imocks)

The mocks functions to use.

#### schema

`GraphQLSchema`

The `schema` to based mocks on.

#### typePolicies?

\{\[`typeName`: `string`\]: [`TypePolicy`](/docs/api/mock/src/type-aliases/typepolicy); \}

## Returns

[`IMockStore`](/docs/api/mock/src/interfaces/imockstore)
